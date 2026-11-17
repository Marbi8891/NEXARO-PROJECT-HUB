import pytest

from app.db import SessionLocal
from app.main import app
from app.models import GithubCredential
from app.routers.github import get_github_transport

from .fake_github import TOKEN, FakeGithub


@pytest.fixture
def gh(auth_client):
    fake = FakeGithub()
    app.dependency_overrides[get_github_transport] = lambda: fake.transport
    return fake


def connect(c):
    r = c.post("/api/github/connect", json={"token": TOKEN})
    assert r.status_code == 200, r.text
    return r.json()


def test_connect_stores_token_encrypted_and_never_returns_it(auth_client, gh):
    body = connect(auth_client)
    assert body["connected"] is True and body["login"] == "octo"
    assert TOKEN not in str(body)
    assert TOKEN not in auth_client.get("/api/github/status").text
    with SessionLocal() as db:
        cred = db.query(GithubCredential).one()
        assert cred.token_encrypted and TOKEN not in cred.token_encrypted


def test_connect_rejects_bad_token(auth_client, gh):
    r = auth_client.post("/api/github/connect", json={"token": "ghp_" + "b" * 36})
    assert r.status_code == 400
    assert auth_client.get("/api/github/status").json()["connected"] is False


def test_requires_connection(auth_client, gh):
    assert auth_client.get("/api/github/repos").status_code == 400


def test_list_import_sync_and_read_only(auth_client, gh):
    connect(auth_client)
    repos = auth_client.get("/api/github/repos").json()
    assert {r["full_name"] for r in repos} == {"octo/hub", "octo/secret"}
    assert all(r["imported_repository_id"] is None for r in repos)

    r = auth_client.post("/api/github/import", json={"full_name": "octo/hub"})
    assert r.status_code == 201, r.text
    repo = r.json()
    assert repo["readme"] == "# Hello"
    assert repo["languages"] == {"Python": 1000, "Dockerfile": 50}
    assert {d["manager"] for d in repo["dependency_files"]} == {"pip", "docker"}

    project = auth_client.get(f"/api/projects/{repo['project_id']}").json()
    assert project["name"] == "hub" and project["info_verified"] is False and project["status"] is None
    assert "Python" in project["languages"]

    assert auth_client.post("/api/github/import", json={"full_name": "octo/hub"}).status_code == 409
    detail = auth_client.get(f"/api/repositories/{repo['id']}").json()
    assert detail["commits"][0]["message"].startswith("feat: first")

    assert auth_client.post(f"/api/repositories/{repo['id']}/sync").status_code == 200
    assert len(auth_client.get(f"/api/repositories/{repo['id']}").json()["commits"]) == 1  # no duplicates

    imported = {r["full_name"]: r for r in auth_client.get("/api/github/repos").json()}
    assert imported["octo/hub"]["imported_repository_id"] == repo["id"]
    # The hub must never write to GitHub.
    assert {req.method for req in gh.requests} == {"GET"}


def test_import_into_existing_project_and_unlink(auth_client, gh):
    connect(auth_client)
    p = auth_client.post("/api/projects", json={"name": "Existing"}).json()
    repo = auth_client.post("/api/github/import", json={"full_name": "octo/secret", "project_id": p["id"]}).json()
    assert repo["project_id"] == p["id"] and repo["private"] is True
    assert auth_client.get("/api/projects").json()["total"] == 1
    r = auth_client.put(f"/api/repositories/{repo['id']}/project", json={"project_id": None})
    assert r.json()["project_id"] is None
    assert auth_client.delete(f"/api/repositories/{repo['id']}").status_code == 204


def test_import_validates_name(auth_client, gh):
    connect(auth_client)
    assert auth_client.post("/api/github/import", json={"full_name": "../etc/passwd"}).status_code == 422
    assert auth_client.post("/api/github/import", json={"full_name": "octo/missing"}).status_code == 404


def test_disconnect(auth_client, gh):
    connect(auth_client)
    assert auth_client.delete("/api/github/connect").status_code == 204
    assert auth_client.get("/api/github/status").json() == {
        "connected": False, "login": None, "scopes": None, "connected_at": None}
