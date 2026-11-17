"""Application settings loaded from environment variables (never hard-coded secrets)."""
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NEXARO_", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://nexaro:nexaro@localhost:5432/nexaro"
    # Used to derive the encryption key for stored GitHub tokens. MUST be set in production.
    secret_key: str = Field(default=DEFAULT_SECRET, min_length=16)
    session_ttl_hours: int = 12
    cookie_secure: bool = False  # set true behind HTTPS
    cors_origins: list[str] = []
    github_api_url: str = "https://api.github.com"
    login_rate_limit: int = 5  # attempts per minute per IP
    api_rate_limit: int = 300  # requests per minute per IP
    seed_initial_projects: bool = True
    # Development convenience: serve the static frontend from FastAPI (Docker uses nginx instead).
    frontend_dir: str | None = None

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @model_validator(mode="after")
    def _no_default_secret_in_production(self):
        if self.is_production and self.secret_key == DEFAULT_SECRET:
            raise ValueError("NEXARO_SECRET_KEY must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
