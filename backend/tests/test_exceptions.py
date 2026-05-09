"""Tests for app.exceptions — AppError + global handler."""

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.exceptions import AppError, register_exception_handlers


def _build_app() -> FastAPI:
    """Throwaway FastAPI app for handler tests."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/raise-app-error")
    def _raise_app_error() -> None:
        raise AppError("Custom failure", status_code=400, data={"field": "email"})

    @app.get("/raise-http-error")
    def _raise_http_error() -> None:
        raise HTTPException(status_code=404, detail="Not found")

    @app.get("/raise-unhandled")
    def _raise_unhandled() -> None:
        raise RuntimeError("boom")

    return app


def test_app_error_returns_envelope() -> None:
    """AppError is serialized to {status: failure, message, data} with the requested status code."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/raise-app-error")
    assert response.status_code == 400
    assert response.json() == {
        "status": "failure",
        "message": "Custom failure",
        "data": {"field": "email"},
    }


def test_http_exception_returns_envelope() -> None:
    """FastAPI HTTPException is wrapped in the failure envelope (not the default {detail: ...})."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/raise-http-error")
    assert response.status_code == 404
    assert response.json() == {
        "status": "failure",
        "message": "Not found",
        "data": None,
    }


def test_unhandled_exception_returns_500_envelope() -> None:
    """Unhandled exceptions → 500 with a generic safe message (no leakage of internal details)."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/raise-unhandled")
    assert response.status_code == 500
    body = response.json()
    assert body["status"] == "failure"
    assert body["message"] == "Internal server error"
    assert body["data"] is None


def test_app_error_default_status() -> None:
    """AppError with no status_code defaults to 400."""
    err = AppError("oops")
    assert err.status_code == 400
    assert err.message == "oops"
    assert err.data is None
