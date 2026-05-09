"""Tests for app.config Settings."""

import pytest

from app.config import Settings


def test_settings_loads_required_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Settings reads DB_*, JWT_SECRET, ALLOWED_ORIGINS from env."""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "projecthub")
    monkeypatch.setenv("DB_USER", "postgres")
    monkeypatch.setenv("DB_PASSWORD", "secret")
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")

    s = Settings()

    assert s.db_host == "localhost"
    assert s.db_port == 5432
    assert s.db_name == "projecthub"
    assert s.db_user == "postgres"
    assert s.db_password == "secret"
    assert s.jwt_secret == "x" * 32
    assert s.allowed_origins == ["http://localhost:3000", "http://localhost:5173"]


def test_db_url_is_constructed(monkeypatch: pytest.MonkeyPatch) -> None:
    """db_url property assembles a postgresql:// connection string."""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "projecthub")
    monkeypatch.setenv("DB_USER", "postgres")
    monkeypatch.setenv("DB_PASSWORD", "secret")
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000")

    s = Settings()
    assert s.db_url == "postgresql://postgres:secret@localhost:5432/projecthub"


def test_missing_required_field_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """Settings raises ValidationError when a required field is absent."""
    # Clear all relevant env vars
    for k in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET", "ALLOWED_ORIGINS"):
        monkeypatch.delenv(k, raising=False)
    # Ensure no .env files leak in
    monkeypatch.setenv("PYDANTIC_SETTINGS_DISABLE_ENV_FILE", "1")

    with pytest.raises(Exception):  # ValidationError from pydantic
        Settings(_env_file=None)
