import re
import unicodedata
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Category, Priority, Project, Status, Task, TaskStatus, User
from ..schemas import (
    ProjectCreate, ProjectList, ProjectOut, ProjectUpdate, StatusUpdate, TaskCreate, TaskOut, TaskUpdate,
)
from ..security import audit, current_user, require_owner

router = APIRouter(prefix="/api/projects", tags=["projects"])

SORTS = {
    "updated": Project.updated_at.desc(),
    "created": Project.created_at.desc(),
    "name": Project.name.asc(),
    "priority": case(
        {Priority.CRITICAL: 0, Priority.HIGH: 1, Priority.MEDIUM: 2, Priority.LOW: 3}, value=Project.priority
    ).asc(),
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:100] or "project"


def unique_slug(db: Session, name: str) -> str:
    base = slugify(name)
    slug, n = base, 2
    while db.scalar(select(Project.id).where(Project.slug == slug)):
        slug, n = f"{base}-{n}", n + 1
    return slug


def to_out(db: Session, p: Project) -> ProjectOut:
    open_tasks = db.scalar(select(func.count(Task.id)).where(Task.project_id == p.id, Task.status != TaskStatus.DONE))
    out = ProjectOut.model_validate(p)
    out.open_tasks = open_tasks or 0
    return out


def get_project_or_404(db: Session, project_id: int) -> Project:
    p = db.get(Project, project_id, options=[selectinload(Project.repositories)])
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return p


def _dump(model) -> dict:
    data = model.model_dump(exclude_unset=True, mode="json")
    # HttpUrl -> str already via mode=json; dates back to python objects
    for key in ("start_date",):
        if data.get(key):
            data[key] = getattr(model, key)
    for key in ("category", "status", "priority"):
        if key in data and data[key] is not None:
            data[key] = getattr(model, key)
    return data


@router.get("", response_model=ProjectList)
def list_projects(
    db: Session = Depends(get_db), _: User = Depends(current_user),
    q: str | None = Query(None, max_length=100),
    category: Category | None = None,
    status_: Status | Literal["pending"] | None = Query(None, alias="status"),
    priority: Priority | None = None,
    is_public: bool | None = None,
    sort: Literal["updated", "created", "name", "priority"] = "updated",
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(Project)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Project.name).like(like), func.lower(Project.description).like(like)))
    if category:
        stmt = stmt.where(Project.category == category)
    if status_ == "pending":
        stmt = stmt.where(Project.status.is_(None))
    elif status_:
        stmt = stmt.where(Project.status == status_)
    if priority:
        stmt = stmt.where(Project.priority == priority)
    if is_public is not None:
        stmt = stmt.where(Project.is_public == is_public)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.options(selectinload(Project.repositories)).order_by(SORTS[sort], Project.id).limit(limit).offset(offset)
    ).all()
    return ProjectList(items=[to_out(db, p) for p in rows], total=total or 0)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, request: Request, db: Session = Depends(get_db),
                   user: User = Depends(require_owner)):
    p = Project(slug=unique_slug(db, body.name), **_dump(body))
    db.add(p)
    db.flush()
    audit(db, request, user, "project.create", "project", p.id, f"Created project {p.name}")
    db.commit()
    return to_out(db, get_project_or_404(db, p.id))


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    return to_out(db, get_project_or_404(db, project_id))


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, body: ProjectUpdate, request: Request, db: Session = Depends(get_db),
                   user: User = Depends(require_owner)):
    p = get_project_or_404(db, project_id)
    data = _dump(body)
    if "name" in data and data["name"] is None:
        raise HTTPException(422, "name cannot be null")
    changed = sorted(k for k, v in data.items() if getattr(p, k) != v)
    for k in changed:
        setattr(p, k, data[k])
    if changed:
        p.updated_at = datetime.now(timezone.utc)
        audit(db, request, user, "project.update", "project", p.id, f"{p.name}: {', '.join(changed)}")
    db.commit()
    return to_out(db, get_project_or_404(db, p.id))


@router.put("/{project_id}/status", response_model=ProjectOut)
def set_status(project_id: int, body: StatusUpdate, request: Request, db: Session = Depends(get_db),
               user: User = Depends(require_owner)):
    p = get_project_or_404(db, project_id)
    old = p.status.value if p.status else "pending"
    p.status = body.status
    p.updated_at = datetime.now(timezone.utc)
    audit(db, request, user, "project.status", "project", p.id,
          f"{p.name}: {old} → {body.status.value if body.status else 'pending'}")
    db.commit()
    return to_out(db, get_project_or_404(db, p.id))


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, request: Request, db: Session = Depends(get_db),
                   user: User = Depends(require_owner)):
    p = get_project_or_404(db, project_id)
    audit(db, request, user, "project.delete", "project", p.id, f"Deleted project {p.name}")
    db.delete(p)
    db.commit()


# ---------- tasks ----------
@router.get("/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(project_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    get_project_or_404(db, project_id)
    return db.scalars(select(Task).where(Task.project_id == project_id).order_by(Task.status, Task.created_at)).all()


@router.post("/{project_id}/tasks", response_model=TaskOut, status_code=201)
def create_task(project_id: int, body: TaskCreate, request: Request, db: Session = Depends(get_db),
                user: User = Depends(require_owner)):
    p = get_project_or_404(db, project_id)
    t = Task(project_id=p.id, **body.model_dump())
    if t.status == TaskStatus.DONE:
        t.completed_at = datetime.now(timezone.utc)
    db.add(t)
    db.flush()
    audit(db, request, user, "task.create", "task", t.id, f"{p.name}: {t.title}")
    db.commit()
    return t


def _task_or_404(db: Session, project_id: int, task_id: int) -> Task:
    t = db.get(Task, task_id)
    if not t or t.project_id != project_id:
        raise HTTPException(404, "Task not found")
    return t


@router.patch("/{project_id}/tasks/{task_id}", response_model=TaskOut)
def update_task(project_id: int, task_id: int, body: TaskUpdate, request: Request,
                db: Session = Depends(get_db), user: User = Depends(require_owner)):
    t = _task_or_404(db, project_id, task_id)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        if v is None and k in ("title", "status", "priority"):
            continue
        setattr(t, k, v)
    if "status" in data:
        t.completed_at = datetime.now(timezone.utc) if t.status == TaskStatus.DONE else None
    audit(db, request, user, "task.update", "task", t.id, t.title)
    db.commit()
    return t


@router.delete("/{project_id}/tasks/{task_id}", status_code=204)
def delete_task(project_id: int, task_id: int, request: Request, db: Session = Depends(get_db),
                user: User = Depends(require_owner)):
    t = _task_or_404(db, project_id, task_id)
    audit(db, request, user, "task.delete", "task", t.id, t.title)
    db.delete(t)
    db.commit()
