from app.db import SessionLocal
from app.seed import INITIAL_PROJECTS, seed


def make(c, **kw):
    body = {"name": "Demo", **kw}
    r = c.post("/api/projects", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_create_and_get(auth_client):
    p = make(auth_client, name="Mi Proyecto Ñandú", category="saas", status="planning",
             languages=["Python", " Python ", "JavaScript", ""], demo_url="https://example.com")
    assert p["slug"] == "mi-proyecto-nandu"
    assert p["languages"] == ["Python", "JavaScript"]
    assert p["demo_url"] == "https://example.com/"
    got = auth_client.get(f"/api/projects/{p['id']}").json()
    assert got["name"] == "Mi Proyecto Ñandú" and got["open_tasks"] == 0


def test_unique_slugs(auth_client):
    a, b = make(auth_client, name="Same"), make(auth_client, name="Same")
    assert a["slug"] == "same" and b["slug"] == "same-2"


def test_validation(auth_client):
    assert auth_client.post("/api/projects", json={"name": ""}).status_code == 422
    assert auth_client.post("/api/projects", json={"name": "x", "category": "nope"}).status_code == 422
    assert auth_client.post("/api/projects", json={"name": "x", "demo_url": "javascript:alert(1)"}).status_code == 422


def test_update_partial_and_status(auth_client):
    p = make(auth_client, description="keep me")
    r = auth_client.patch(f"/api/projects/{p['id']}", json={"name": "Renamed", "priority": "high"})
    assert r.status_code == 200
    assert r.json()["description"] == "keep me" and r.json()["priority"] == "high"
    r = auth_client.put(f"/api/projects/{p['id']}/status", json={"status": "production"})
    assert r.json()["status"] == "production"
    r = auth_client.put(f"/api/projects/{p['id']}/status", json={"status": None})
    assert r.json()["status"] is None
    assert auth_client.patch(f"/api/projects/{p['id']}", json={"name": None}).status_code == 422


def test_delete(auth_client):
    p = make(auth_client)
    assert auth_client.delete(f"/api/projects/{p['id']}").status_code == 204
    assert auth_client.get(f"/api/projects/{p['id']}").status_code == 404


def test_search_filter_sort(auth_client):
    make(auth_client, name="Alpha AI", category="artificial_intelligence", status="in_development", priority="low")
    make(auth_client, name="Beta Shop", category="ecommerce", status="production", priority="critical",
         description="tienda online")
    make(auth_client, name="Gamma")
    names = lambda r: [p["name"] for p in r.json()["items"]]  # noqa: E731
    assert names(auth_client.get("/api/projects?q=alpha")) == ["Alpha AI"]
    assert names(auth_client.get("/api/projects?q=TIENDA")) == ["Beta Shop"]
    assert names(auth_client.get("/api/projects?category=ecommerce")) == ["Beta Shop"]
    assert names(auth_client.get("/api/projects?status=pending")) == ["Gamma"]
    assert names(auth_client.get("/api/projects?sort=name")) == ["Alpha AI", "Beta Shop", "Gamma"]
    assert names(auth_client.get("/api/projects?sort=priority"))[0] == "Beta Shop"
    assert auth_client.get("/api/projects?status=bogus").status_code == 422
    assert auth_client.get("/api/projects").json()["total"] == 3


def test_tasks(auth_client):
    p = make(auth_client)
    base = f"/api/projects/{p['id']}/tasks"
    t = auth_client.post(base, json={"title": "Escribir tests"}).json()
    assert t["status"] == "todo"
    assert auth_client.get(f"/api/projects/{p['id']}").json()["open_tasks"] == 1
    t = auth_client.patch(f"{base}/{t['id']}", json={"status": "done"}).json()
    assert t["completed_at"] is not None
    assert auth_client.get(f"/api/projects/{p['id']}").json()["open_tasks"] == 0
    other = make(auth_client, name="Other")
    assert auth_client.patch(f"/api/projects/{other['id']}/tasks/{t['id']}", json={"title": "x"}).status_code == 404
    assert auth_client.delete(f"{base}/{t['id']}").status_code == 204


def test_seed_is_idempotent_and_marks_pending(auth_client):
    with SessionLocal() as db:
        assert seed(db) == 7
        assert seed(db) == 0
    items = auth_client.get("/api/projects?sort=name&status=pending").json()["items"]
    assert sorted(p["name"] for p in items) == sorted(INITIAL_PROJECTS)
    for p in items:
        assert p["info_verified"] is False
        assert p["category"] is None and p["status"] is None and p["description"] is None
        assert p["repositories"] == []
