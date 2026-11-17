"""Idempotent seed of the initial project registry.

Only the names are known. Description, category, status and repository are deliberately left
empty and the records are flagged as pending verification: nothing is invented.
"""
from sqlalchemy import select

from .config import get_settings
from .db import SessionLocal
from .models import Project
from .routers.projects import slugify

INITIAL_PROJECTS = [
    "Python Learning Dashboard",
    "NEXARO Personal AI",
    "NEXARO Network Intelligence",
    "CS Mentor",
    "Excel Academy",
    "AI Commerce Operating System",
    "Claude Architect Academy",
]


def seed(db) -> int:
    created = 0
    for name in INITIAL_PROJECTS:
        slug = slugify(name)
        if db.scalar(select(Project.id).where(Project.slug == slug)):
            continue
        db.add(Project(slug=slug, name=name, info_verified=False,
                       languages=[], frameworks=[], dependencies=[], features=[]))
        created += 1
    db.commit()
    return created


if __name__ == "__main__":
    if not get_settings().seed_initial_projects:
        print("Seeding disabled (NEXARO_SEED_INITIAL_PROJECTS=false)")
        raise SystemExit(0)
    with SessionLocal() as session:
        print(f"Seeded {seed(session)} project(s)")
