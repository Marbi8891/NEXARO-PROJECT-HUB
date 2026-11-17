from app.config import get_settings
from app.models import GithubCredential  # noqa: F401
from app.security import SESSION_COOKIE

from .conftest import PASSWORD


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok", "database": "ok"}


def test_setup_flow_only_once(client):
    assert client.get("/api/auth/setup").json() == {"needs_setup": True}
    r = client.post("/api/auth/setup", json={"email": "Owner@Example.com", "password": PASSWORD})
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "owner@example.com"
    assert client.get("/api/auth/setup").json() == {"needs_setup": False}
    r2 = client.post("/api/auth/setup", json={"email": "x@example.com", "password": PASSWORD})
    assert r2.status_code == 409


def test_setup_rejects_short_password(client):
    r = client.post("/api/auth/setup", json={"email": "o@example.com", "password": "short"})
    assert r.status_code == 422


def test_session_cookie_is_httponly(client):
    r = client.post("/api/auth/setup", json={"email": "o@example.com", "password": PASSWORD})
    cookie = r.headers["set-cookie"]
    assert SESSION_COOKIE in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie


def test_login_logout(auth_client):
    auth_client.post("/api/auth/logout")
    assert auth_client.get("/api/auth/me").status_code == 401
    bad = auth_client.post("/api/auth/login", json={"email": "owner@example.com", "password": "wrong"})
    assert bad.status_code == 401
    unknown = auth_client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert unknown.status_code == 401 and unknown.json() == bad.json()  # no enumeration
    ok = auth_client.post("/api/auth/login", json={"email": "owner@example.com", "password": PASSWORD})
    assert ok.status_code == 200
    me = auth_client.get("/api/auth/me").json()
    assert me["user"]["email"] == "owner@example.com" and me["csrf_token"]


def test_protected_routes_require_auth(client):
    for path in ("/api/projects", "/api/dashboard", "/api/repositories", "/api/github/status"):
        assert client.get(path).status_code == 401, path


def test_csrf_required_for_writes(auth_client):
    token = auth_client.headers.pop("X-CSRF-Token")
    r = auth_client.post("/api/projects", json={"name": "X"})
    assert r.status_code == 403
    auth_client.headers["X-CSRF-Token"] = "wrong"
    assert auth_client.post("/api/projects", json={"name": "X"}).status_code == 403
    auth_client.headers["X-CSRF-Token"] = token
    assert auth_client.post("/api/projects", json={"name": "X"}).status_code == 201


def test_login_rate_limit(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "login_rate_limit", 3)
    codes = [client.post("/api/auth/login", json={"email": "a@example.com", "password": "x"}).status_code
             for _ in range(4)]
    assert codes == [401, 401, 401, 429]


def test_security_headers(client):
    r = client.get("/api/auth/setup")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["cache-control"] == "no-store"


def test_production_requires_secret_key(monkeypatch):
    import pytest
    from pydantic import ValidationError

    from app.config import DEFAULT_SECRET, Settings
    with pytest.raises(ValidationError):
        Settings(env="production", secret_key=DEFAULT_SECRET)
    assert Settings(env="production", secret_key="x" * 32).is_production


def test_unchanged_update_is_not_audited(auth_client):
    p = auth_client.post("/api/projects", json={"name": "Same"}).json()
    auth_client.patch(f"/api/projects/{p['id']}", json={"name": "Same", "priority": "medium"})
    acts = [a["action"] for a in auth_client.get("/api/dashboard").json()["recent_activity"]]
    assert acts == ["project.create"]
