"""Tests for GET /healthz."""

from fastapi.testclient import TestClient


def test_healthz_returns_200(client: TestClient) -> None:
    """Default GET /healthz returns 200 with success envelope."""
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"] == {"ok": True}


def test_healthz_deep_pings_db(client: TestClient) -> None:
    """GET /healthz?deep=1 includes db: 'ok' in data when DB is reachable."""
    response = client.get("/healthz?deep=1")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"] == {"ok": True, "db": "ok"}
