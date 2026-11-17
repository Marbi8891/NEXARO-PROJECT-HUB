"""Pydantic v2 request/response contracts."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator

from .models import Category, Priority, Role, Status, TaskStatus

ORM = ConfigDict(from_attributes=True)


# ---------- auth ----------
class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class SetupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=256)


class UserOut(BaseModel):
    model_config = ORM
    id: int
    email: str
    role: Role


class SessionOut(BaseModel):
    user: UserOut
    csrf_token: str


class SetupStatus(BaseModel):
    needs_setup: bool


# ---------- projects ----------
def _clean_list(v: list[str] | None) -> list[str]:
    if not v:
        return []
    out: list[str] = []
    for item in v:
        item = item.strip()
        if item and item not in out:
            out.append(item[:80])
    return out[:100]


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    category: Category | None = None
    status: Status | None = None
    priority: Priority = Priority.MEDIUM
    is_paused: bool = False
    info_verified: bool = True
    cover_url: HttpUrl | None = None
    demo_url: HttpUrl | None = None
    docs_url: HttpUrl | None = None
    languages: list[str] = []
    frameworks: list[str] = []
    dependencies: list[str] = []
    features: list[str] = []
    start_date: date | None = None
    current_version: str | None = Field(default=None, max_length=40)
    architecture: str | None = Field(default=None, max_length=20000)
    dev_notes: str | None = Field(default=None, max_length=20000)
    security_notes: str | None = Field(default=None, max_length=20000)
    is_public: bool = False
    public_summary: str | None = Field(default=None, max_length=5000)

    _lists = field_validator("languages", "frameworks", "dependencies", "features")(_clean_list)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    """Partial update: only provided fields change."""
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    category: Category | None = None
    status: Status | None = None
    priority: Priority | None = None
    is_paused: bool | None = None
    info_verified: bool | None = None
    cover_url: HttpUrl | None = None
    demo_url: HttpUrl | None = None
    docs_url: HttpUrl | None = None
    languages: list[str] | None = None
    frameworks: list[str] | None = None
    dependencies: list[str] | None = None
    features: list[str] | None = None
    start_date: date | None = None
    current_version: str | None = Field(default=None, max_length=40)
    architecture: str | None = Field(default=None, max_length=20000)
    dev_notes: str | None = Field(default=None, max_length=20000)
    security_notes: str | None = Field(default=None, max_length=20000)
    is_public: bool | None = None
    public_summary: str | None = Field(default=None, max_length=5000)

    _lists = field_validator("languages", "frameworks", "dependencies", "features")(
        lambda v: None if v is None else _clean_list(v))


class StatusUpdate(BaseModel):
    status: Status | None


class RepoBrief(BaseModel):
    model_config = ORM
    id: int
    full_name: str
    html_url: str
    private: bool
    primary_language: str | None
    pushed_at: datetime | None
    last_synced_at: datetime | None


class ProjectOut(BaseModel):
    model_config = ORM
    id: int
    slug: str
    name: str
    description: str | None
    category: Category | None
    status: Status | None
    priority: Priority
    is_paused: bool
    info_verified: bool
    cover_url: str | None
    demo_url: str | None
    docs_url: str | None
    languages: list[str]
    frameworks: list[str]
    dependencies: list[str]
    features: list[str]
    start_date: date | None
    current_version: str | None
    architecture: str | None
    dev_notes: str | None
    security_notes: str | None
    is_public: bool
    public_summary: str | None
    created_at: datetime
    updated_at: datetime
    repositories: list[RepoBrief] = []
    open_tasks: int = 0


class ProjectList(BaseModel):
    items: list[ProjectOut]
    total: int


# ---------- tasks ----------
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: TaskStatus | None = None
    priority: Priority | None = None
    due_date: date | None = None


class TaskOut(BaseModel):
    model_config = ORM
    id: int
    project_id: int
    title: str
    status: TaskStatus
    priority: Priority
    due_date: date | None
    created_at: datetime
    completed_at: datetime | None


# ---------- github ----------
class GithubConnect(BaseModel):
    token: str = Field(min_length=20, max_length=255)

    @field_validator("token")
    @classmethod
    def no_spaces(cls, v: str) -> str:
        v = v.strip()
        if any(c.isspace() for c in v):
            raise ValueError("token must not contain whitespace")
        return v


class GithubStatus(BaseModel):
    connected: bool
    login: str | None = None
    scopes: str | None = None
    connected_at: datetime | None = None


class RemoteRepo(BaseModel):
    github_id: int
    full_name: str
    html_url: str
    description: str | None
    private: bool
    primary_language: str | None
    pushed_at: datetime | None
    stars: int
    imported_repository_id: int | None = None
    project_id: int | None = None


class ImportRequest(BaseModel):
    full_name: str = Field(pattern=r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", max_length=200)
    project_id: int | None = None  # link to existing project; otherwise a new one is created


class CommitOut(BaseModel):
    model_config = ORM
    sha: str
    message: str
    author: str | None
    committed_at: datetime | None
    url: str | None


class RepositoryOut(BaseModel):
    model_config = ORM
    id: int
    github_id: int
    project_id: int | None
    full_name: str
    html_url: str
    description: str | None
    default_branch: str | None
    private: bool
    primary_language: str | None
    languages: dict
    topics: list
    stars: int
    forks: int
    open_issues: int
    pushed_at: datetime | None
    readme: str | None
    dependency_files: list
    last_synced_at: datetime | None


class RepositoryDetail(RepositoryOut):
    commits: list[CommitOut] = []


class LinkRequest(BaseModel):
    project_id: int | None


# ---------- public ----------
class PublicProject(BaseModel):
    """Whitelisted fields only. No notes, tasks, security info or private repos."""
    slug: str
    name: str
    summary: str | None
    category: Category | None
    status: Status | None
    cover_url: str | None
    demo_url: str | None
    docs_url: str | None
    github_url: str | None
    languages: list[str]
    frameworks: list[str]
    features: list[str]
    architecture: str | None
