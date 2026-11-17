"""Unauthenticated portfolio API. Returns only whitelisted fields of projects marked public."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Project
from ..schemas import PublicProject

router = APIRouter(prefix="/api/public", tags=["public"])


def to_public(p: Project) -> PublicProject:
    public_repo = next((r for r in p.repositories if not r.private), None)
    return PublicProject(
        slug=p.slug, name=p.name, summary=p.public_summary or p.description, category=p.category, status=p.status,
        cover_url=p.cover_url, demo_url=p.demo_url, docs_url=p.docs_url,
        github_url=public_repo.html_url if public_repo else None,
        languages=p.languages or [], frameworks=p.frameworks or [], features=p.features or [],
        architecture=p.architecture,
    )


def _public_query():
    return select(Project).where(Project.is_public.is_(True)).options(selectinload(Project.repositories))


@router.get("/projects", response_model=list[PublicProject])
def public_projects(db: Session = Depends(get_db)):
    return [to_public(p) for p in db.scalars(_public_query().order_by(Project.updated_at.desc())).all()]


@router.get("/projects/{slug}", response_model=PublicProject)
def public_project(slug: str, db: Session = Depends(get_db)):
    p = db.scalar(_public_query().where(Project.slug == slug))
    if not p:
        raise HTTPException(404, "Project not found")
    return to_public(p)
