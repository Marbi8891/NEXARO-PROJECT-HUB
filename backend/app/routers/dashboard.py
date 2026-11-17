"""Overview metrics. Every number is computed from the database; nothing is estimated."""
from collections import Counter
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import AuditLog, Commit, Project, Repository, Status, Task, TaskStatus, User
from ..security import current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ACTIVE = {Status.PLANNING, Status.IN_DEVELOPMENT, Status.TESTING}
COMPLETED = {Status.PRODUCTION, Status.MAINTENANCE}
STALE_DAYS = 30


def _aware(dt: datetime | None) -> datetime | None:
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("")
def overview(db: Session = Depends(get_db), _: User = Depends(current_user)):
    projects = db.scalars(select(Project).options(selectinload(Project.repositories))).all()
    by_status = Counter(p.status.value if p.status else "pending" for p in projects)
    by_category = Counter(p.category.value if p.category else "pending" for p in projects)
    tech = Counter()
    for p in projects:
        for t in {*(p.languages or []), *(p.frameworks or [])}:
            tech[t] += 1

    open_tasks = db.scalars(select(Task).where(Task.status != TaskStatus.DONE)).all()
    today = date.today()
    overdue_by_project = Counter(t.project_id for t in open_tasks if t.due_date and t.due_date < today)

    now = datetime.now(timezone.utc)
    attention = []
    for p in projects:
        reasons = []
        if not p.info_verified or p.status is None or p.category is None:
            reasons.append("pending_verification")
        if overdue_by_project.get(p.id):
            reasons.append("overdue_tasks")
        if p.status in ACTIVE and not p.is_paused and _aware(p.updated_at) < now - timedelta(days=STALE_DAYS):
            reasons.append("stale")
        if p.status in ACTIVE | COMPLETED and not p.repositories:
            reasons.append("no_repository")
        if reasons:
            attention.append({"id": p.id, "name": p.name, "reasons": reasons})

    commits = db.execute(
        select(Commit, Repository.full_name).join(Repository)
        .order_by(Commit.committed_at.desc().nulls_last()).limit(10)
    ).all()
    activity = db.scalars(
        select(AuditLog).where(~AuditLog.action.like("auth.%")).order_by(AuditLog.created_at.desc()).limit(10)
    ).all()

    return {
        "totals": {
            "projects": len(projects),
            "active": sum(1 for p in projects if p.status in ACTIVE and not p.is_paused),
            "completed": sum(1 for p in projects if p.status in COMPLETED),
            "paused": sum(1 for p in projects if p.is_paused),
            "production": by_status.get(Status.PRODUCTION.value, 0),
            "pending_verification": sum(1 for p in projects if p.status is None or not p.info_verified),
            "repositories": db.scalar(select(func.count(Repository.id))) or 0,
            "technologies": len(tech),
            "pending_tasks": len(open_tasks),
        },
        "by_status": dict(by_status),
        "by_category": dict(by_category),
        "technologies": [{"name": n, "projects": c} for n, c in tech.most_common(20)],
        "recent_commits": [
            {"repository": full_name, "sha": c.sha[:7], "message": c.message.split("\n")[0][:140],
             "author": c.author, "committed_at": c.committed_at, "url": c.url}
            for c, full_name in commits
        ],
        "recent_activity": [
            {"action": a.action, "summary": a.summary, "entity_type": a.entity_type,
             "entity_id": a.entity_id, "created_at": a.created_at}
            for a in activity
        ],
        "attention": attention,
        "definitions": {
            "active": "status in planning/in_development/testing and not paused",
            "completed": "status in production/maintenance",
            "paused": "is_paused flag set by the owner",
            "stale": f"active project not updated in {STALE_DAYS} days",
        },
    }
