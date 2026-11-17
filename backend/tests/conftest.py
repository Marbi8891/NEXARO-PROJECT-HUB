import os

os.environ.setdefault("NEXARO_DATABASE_URL", "postgresql+psycopg://nexaro:nexaro@localhost:5432/nexaro_test")
os.environ["NEXARO_SECRET_KEY"] = "test-secret-key-0123456789"
os.environ["NEXARO_LOGIN_RATE_LIMIT"] = "1000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.security import rate_limiter  # noqa: E402

PASSWORD = "correct-horse-battery-staple"


@pytest.fixture(autouse=True)
def _db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    rate_limiter.reset()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_client(client):
    """Client logged in as the owner, with the CSRF header pre-set."""
    r = client.post("/api/auth/setup", json={"email": "owner@example.com", "password": PASSWORD})
    assert r.status_code == 201, r.text
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    return client
