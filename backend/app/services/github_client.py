"""Read-only GitHub REST API client. It never performs write operations on repositories."""
import base64
from datetime import datetime

import httpx
from fastapi import HTTPException, status

from ..config import get_settings

# Files that reveal package managers / dependencies. Only names are recorded; content is never executed.
DEPENDENCY_FILES = {
    "package.json": "npm", "package-lock.json": "npm", "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn",
    "requirements.txt": "pip", "pyproject.toml": "python", "Pipfile": "pipenv", "poetry.lock": "poetry",
    "environment.yml": "conda", "pom.xml": "maven", "build.gradle": "gradle", "build.gradle.kts": "gradle",
    "composer.json": "composer", "Gemfile": "bundler", "go.mod": "go", "Cargo.toml": "cargo",
    "Dockerfile": "docker", "docker-compose.yml": "docker-compose", "compose.yaml": "docker-compose",
}
MAX_README_BYTES = 200_000


def parse_dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


class GithubClient:
    def __init__(self, token: str, transport: httpx.BaseTransport | None = None):
        self._client = httpx.Client(
            base_url=get_settings().github_api_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "nexaro-projects-hub",
            },
            timeout=15.0,
            transport=transport,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def _get(self, path: str, params: dict | None = None, allow_404: bool = False):
        # Only GET is ever used: this client is read-only by design.
        try:
            r = self._client.get(path, params=params)
        except httpx.HTTPError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "GitHub is unreachable") from exc
        if r.status_code in (404, 409) and allow_404:  # 409 = empty repository
            return None, r
        if r.status_code == 401:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "GitHub rejected the token (invalid or expired)")
        if r.status_code == 403 and r.headers.get("x-ratelimit-remaining") == "0":
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "GitHub API rate limit reached")
        if r.status_code >= 400:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"GitHub API error ({r.status_code})")
        return r.json(), r

    def get_user(self) -> tuple[dict, str | None]:
        data, r = self._get("/user")
        return data, r.headers.get("x-oauth-scopes")

    def list_repos(self, max_pages: int = 5) -> list[dict]:
        repos: list[dict] = []
        for page in range(1, max_pages + 1):
            data, _ = self._get("/user/repos", {"per_page": 100, "page": page, "sort": "pushed",
                                                "affiliation": "owner,collaborator"})
            repos.extend(data)
            if len(data) < 100:
                break
        return repos

    def get_repo(self, full_name: str) -> dict:
        data, _ = self._get(f"/repos/{full_name}", allow_404=True)
        if data is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Repository not found or not accessible with this token")
        return data

    def get_languages(self, full_name: str) -> dict:
        data, _ = self._get(f"/repos/{full_name}/languages")
        return data or {}

    def get_readme(self, full_name: str) -> str | None:
        data, _ = self._get(f"/repos/{full_name}/readme", allow_404=True)
        if not data or data.get("encoding") != "base64":
            return None
        raw = base64.b64decode(data.get("content", ""))[:MAX_README_BYTES]
        return raw.decode("utf-8", errors="replace")

    def get_root_files(self, full_name: str) -> list[str]:
        data, _ = self._get(f"/repos/{full_name}/contents/", allow_404=True)
        if not isinstance(data, list):
            return []
        return [item["name"] for item in data if item.get("type") == "file"]

    def get_commits(self, full_name: str, limit: int = 20) -> list[dict]:
        data, r = self._get(f"/repos/{full_name}/commits", {"per_page": limit}, allow_404=True)
        if data is None:
            return []
        return data


def detect_dependency_files(names: list[str]) -> list[dict]:
    return [{"file": n, "manager": DEPENDENCY_FILES[n]} for n in names if n in DEPENDENCY_FILES]
