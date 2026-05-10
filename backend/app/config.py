"""Application settings — loaded from env via pydantic-settings."""

from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single-source-of-truth for runtime configuration.

    Reads from process environment variables. In dev, .env.local is
    loaded automatically (gitignored). Required fields raise on boot
    if missing — fail fast.
    """

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        enable_decoding=False,
    )

    # Database
    db_host: str = Field(..., alias="DB_HOST")
    db_port: int = Field(..., alias="DB_PORT")
    db_name: str = Field(..., alias="DB_NAME")
    db_user: str = Field(..., alias="DB_USER")
    db_password: str = Field(..., alias="DB_PASSWORD")

    # Auth (used in Phase 2)
    jwt_secret: str = Field(..., alias="JWT_SECRET", min_length=32)

    # CORS
    allowed_origins: List[str] = Field(..., alias="ALLOWED_ORIGINS")

    # AI (used in Phase 6) — optional in Phase 1
    gemini_api_key: str = Field("", alias="GEMINI_API_KEY")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        """Accept comma-separated string from env, return list."""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def db_url(self) -> str:
        """SQLAlchemy / psycopg-style connection URL."""
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()  # type: ignore[call-arg]
