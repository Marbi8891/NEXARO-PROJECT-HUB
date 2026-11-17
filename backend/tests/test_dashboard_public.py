import pytest

from app.main import app
from app.routers.github import get_github_transport

from .fake_github import TOKEN, FakeGithub


def test_empty_dashboard_has_zero_metrics(auth_client):
    d = auth_client.get("/api/dashboard").json()
    assert all(v == 0 for v in d["totals"].values())
    assert d["recent_commits"] == [] and d["attention"] == []


def test_dashboard_counts_real_data(auth_client):
    c = auth_client
    a = c.post("/api/projects", json={"name": "A", "status": "in_development", "category": "saas",
                                      "languages": ["Python"], "frameworks": ["FastAPI"]}).json()
    c.post("/api/projects", json={"name": "B", "status": "production", "category": "saas", "languages": ["Python"]})
    c.post("/api/projects", json={"name": "C", "status": "testing", "is_paused": True, "category": "education"})
    c.post("/api/projects", json={"name": "D"})
    c.post(f"/api/projects/{a['id']}/tasks", json={"title": "late", "due_date": "2020-01-01"})
    d = c.get("/api/dashboard").json()
    t = d["totals"]
    assert t == {"projects": 4, "active": 1, "completed": 1, "paused": 1, "production": 1,
                 "pending_verification": 1, "repositories": 0, "technologies": 2, "pending_tasks": 1}
    assert d["by_category"] == {"saas": 2, "education": 1, "pending": 1}
    assert {x["name"]: x["projects"] for x in d["technologies"]} == {"Python": 2, "FastAPI": 1}
    att = {x["name"]: x["reasons"] for x in d["attention"]}
    assert "overdue_tasks" in att["A"] and "no_repository" in att["A"]
    assert att["D"] == ["pending_verification"]
    assert d["recent_activity"][0]["action"] == "task.create"


def test_public_portfolio_only_exposes_whitelisted_fields(auth_client):
    c = auth_client
    c.post("/api/projects", json={"name": "Private One", "dev_notes": "SECRET-NOTE"})
    pub = c.post("/api/projects", json={"name": "Public One", "is_public": True, "dev_notes": "SECRET-NOTE",
                                        "security_notes": "SECRET-SEC", "public_summary": "Hola"}).json()
    c.post(f"/api/projects/{pub['id']}/tasks", json={"title": "SECRET-TASK"})
    c.post("/api/auth/logout")
    r = c.get("/api/public/projects")
    assert r.status_code == 200
    assert [p["name"] for p in r.json()] == ["Public One"]
    for secret in ("SECRET-NOTE", "SECRET-SEC", "SECRET-TASK", "dev_notes", "security_notes"):
        assert secret not in r.text
    assert c.get(f"/api/public/projects/{pub['slug']}").json()["summary"] == "Hola"
    assert c.get("/api/public/projects/private-one").status_code == 404


def test_public_hides_private_repo_link(auth_client):
    fake = FakeGithub()
    app.dependency_overrides[get_github_transport] = lambda: fake.transport
    c = auth_client
    c.post("/api/github/connect", json={"token": TOKEN})
    p = c.post("/api/projects", json={"name": "P", "is_public": True}).json()
    c.post("/api/github/import", json={"full_name": "octo/secret", "project_id": p["id"]})
    q = c.post("/api/projects", json={"name": "Q", "is_public": True}).json()
    c.post("/api/github/import", json={"full_name": "octo/hub", "project_id": q["id"]})
    data = {x["name"]: x for x in c.get("/api/public/projects").json()}
    assert data["P"]["github_url"] is None
    assert data["Q"]["github_url"] == "https://github.com/octo/hub"
    assert "octo/secret" not in c.get("/api/public/projects").text
    d = c.get("/api/dashboard").json()
    assert d["totals"]["repositories"] == 2 and d["recent_commits"][0]["sha"] == "aaaaaaa"


@pytest.mark.parametrize("path", ["/api/public/projects"])
def test_public_needs_no_auth(client, path):
    assert client.get(path).status_code == 200
