"""GitHub connection, repository listing, import and read-only synchronisation."""
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Commit, GithubCredential, Project, Repository, User
from ..schemas import (
    GithubConnect, GithubStatus, ImportRequest, LinkRequest, RemoteRepo, RepositoryDetail, RepositoryOut,
)
from ..security import audit, current_user, decrypt_secret, encrypt_secret, require_owner
from ..services.github_client import GithubClient, detect_dependency_files, parse_dt
from .projects import unique_slug

router = APIRouter(prefix="/api", tags=["github"])


def get_github_transport() -> httpx.BaseTransport | None:
    """Overridden in tests with a mock transport."""
    return None


def _credential(db: Session, user: User) -> GithubCredential:
    cred = db.scalar(select(GithubCredential).where(GithubCredential.user_id == user.id))
    if not cred:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "GitHub is not connected")
    return cred


def _client(db: Session, user: User, transport) -> GithubClient:
    return GithubClient(decrypt_secret(_credential(db, user).token_encrypted), transport)


# ---------- connection ----------
@router.get("/github/status", response_model=GithubStatus)
def github_status(db: Session = Depends(get_db), user: User = Depends(current_user)):
    cred = db.scalar(select(GithubCredential).where(GithubCredential.user_id == user.id))
    if not cred:
        return GithubStatus(connected=False)
    return GithubStatus(connected=True, login=cred.login, scopes=cred.scopes, connected_at=cred.created_at)


@router.post("/github/connect", response_model=GithubStatus)
def github_connect(body: GithubConnect, request: Request, db: Session = Depends(get_db),
                   user: User = Depends(require_owner), transport=Depends(get_github_transport)):
    """Validate a GitHub token against /user and store it encrypted. The token is never returned."""
    with GithubClient(body.token, transport) as gh:
        gh_user, scopes = gh.get_user()
    cred = db.scalar(select(GithubCredential).where(GithubCredential.user_id == user.id))
    if not cred:
        cred = GithubCredential(user_id=user.id, login="", token_encrypted="")
        db.add(cred)
    cred.login = gh_user.get("login", "")
    cred.token_encrypted = encrypt_secret(body.token)
    cred.scopes = scopes
    cred.created_at = datetime.now(timezone.utc)
    audit(db, request, user, "github.connect", "github", cred.login, f"Connected GitHub account {cred.login}")
    db.commit()
    return GithubStatus(connected=True, login=cred.login, scopes=cred.scopes, connected_at=cred.created_at)


@router.delete("/github/connect", status_code=204)
def github_disconnect(request: Request, db: Session = Depends(get_db), user: User = Depends(require_owner)):
    cred = db.scalar(select(GithubCredential).where(GithubCredential.user_id == user.id))
    if cred:
        audit(db, request, user, "github.disconnect", "github", cred.login, "Disconnected GitHub")
        db.delete(cred)
        db.commit()


@router.get("/github/repos", response_model=list[RemoteRepo])
def github_repos(db: Session = Depends(get_db), user: User = Depends(require_owner),
                 transport=Depends(get_github_transport)):
    with _client(db, user, transport) as gh:
        remote = gh.list_repos()
    imported = {r.github_id: r for r in db.scalars(select(Repository)).all()}
    out = []
    for r in remote:
        local = imported.get(r["id"])
        out.append(RemoteRepo(
            github_id=r["id"], full_name=r["full_name"], html_url=r["html_url"], description=r.get("description"),
            private=r.get("private", False), primary_language=r.get("language"), pushed_at=parse_dt(r.get("pushed_at")),
            stars=r.get("stargazers_count", 0),
            imported_repository_id=local.id if local else None, project_id=local.project_id if local else None,
        ))
    return out


# ---------- sync ----------
def sync_repository(db: Session, gh: GithubClient, repo: Repository) -> Repository:
    data = gh.get_repo(repo.full_name)
    repo.full_name = data["full_name"]
    repo.html_url = data["html_url"]
    repo.description = data.get("description")
    repo.default_branch = data.get("default_branch")
    repo.private = data.get("private", False)
    repo.primary_language = data.get("language")
    repo.topics = data.get("topics") or []
    repo.stars = data.get("stargazers_count", 0)
    repo.forks = data.get("forks_count", 0)
    repo.open_issues = data.get("open_issues_count", 0)
    repo.pushed_at = parse_dt(data.get("pushed_at"))
    repo.languages = gh.get_languages(repo.full_name)
    repo.readme = gh.get_readme(repo.full_name)
    repo.dependency_files = detect_dependency_files(gh.get_root_files(repo.full_name))
    existing = {c.sha for c in repo.commits}
    for c in gh.get_commits(repo.full_name):
        if c["sha"] in existing:
            continue
        info = c.get("commit", {})
        repo.commits.append(Commit(
            sha=c["sha"], message=(info.get("message") or "")[:5000],
            author=((info.get("author") or {}).get("name") or "")[:120] or None,
            committed_at=parse_dt((info.get("author") or {}).get("date")), url=c.get("html_url"),
        ))
    repo.last_synced_at = datetime.now(timezone.utc)
    # Keep the linked project's languages in sync with what GitHub reports (verified data).
    if repo.project and repo.languages:
        langs = list(repo.project.languages or [])
        for lang in repo.languages:
            if lang not in langs:
                langs.append(lang)
        repo.project.languages = langs
    return repo


@router.post("/github/import", response_model=RepositoryOut, status_code=201)
def github_import(body: ImportRequest, request: Request, db: Session = Depends(get_db),
                  user: User = Depends(require_owner), transport=Depends(get_github_transport)):
    """Import a repository (read-only). Creates a project unless project_id is given."""
    with _client(db, user, transport) as gh:
        data = gh.get_repo(body.full_name)
        if db.scalar(select(Repository.id).where(Repository.github_id == data["id"])):
            raise HTTPException(status.HTTP_409_CONFLICT, "Repository already imported")
        if body.project_id is not None:
            project = db.get(Project, body.project_id)
            if not project:
                raise HTTPException(404, "Project not found")
        else:
            project = Project(
                slug=unique_slug(db, data["name"]), name=data["name"], description=data.get("description"),
                info_verified=False,  # category/status are unknown until the owner reviews them
                languages=[], frameworks=[], dependencies=[], features=[],
            )
            db.add(project)
            db.flush()
        repo = Repository(github_id=data["id"], full_name=data["full_name"], html_url=data["html_url"],
                          project=project, commits=[])
        db.add(repo)
        sync_repository(db, gh, repo)
    db.flush()
    audit(db, request, user, "github.import", "repository", repo.id, f"Imported {repo.full_name}")
    db.commit()
    return repo


@router.get("/repositories", response_model=list[RepositoryOut])
def list_repositories(db: Session = Depends(get_db), _: User = Depends(current_user)):
    return db.scalars(select(Repository).order_by(Repository.pushed_at.desc().nulls_last())).all()


def _repo_or_404(db: Session, repo_id: int) -> Repository:
    repo = db.get(Repository, repo_id, options=[selectinload(Repository.commits)])
    if not repo:
        raise HTTPException(404, "Repository not found")
    return repo


@router.get("/repositories/{repo_id}", response_model=RepositoryDetail)
def get_repository(repo_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    repo = _repo_or_404(db, repo_id)
    out = RepositoryDetail.model_validate(repo)
    out.commits = sorted(out.commits, key=lambda c: c.committed_at or datetime.min.replace(tzinfo=timezone.utc),
                         reverse=True)[:30]
    return out


@router.post("/repositories/{repo_id}/sync", response_model=RepositoryOut)
def sync_repo(repo_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_owner),
              transport=Depends(get_github_transport)):
    repo = _repo_or_404(db, repo_id)
    with _client(db, user, transport) as gh:
        sync_repository(db, gh, repo)
    audit(db, request, user, "github.sync", "repository", repo.id, f"Synced {repo.full_name}")
    db.commit()
    return repo


@router.put("/repositories/{repo_id}/project", response_model=RepositoryOut)
def link_repo(repo_id: int, body: LinkRequest, request: Request, db: Session = Depends(get_db),
              user: User = Depends(require_owner)):
    repo = _repo_or_404(db, repo_id)
    if body.project_id is not None and not db.get(Project, body.project_id):
        raise HTTPException(404, "Project not found")
    repo.project_id = body.project_id
    audit(db, request, user, "repository.link", "repository", repo.id, f"{repo.full_name} → project {body.project_id}")
    db.commit()
    return repo


@router.delete("/repositories/{repo_id}", status_code=204)
def remove_repo(repo_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_owner)):
    """Removes the local copy only. Nothing is changed on GitHub."""
    repo = _repo_or_404(db, repo_id)
    audit(db, request, user, "repository.remove", "repository", repo.id, f"Removed local copy of {repo.full_name}")
    db.delete(repo)
    db.commit()
