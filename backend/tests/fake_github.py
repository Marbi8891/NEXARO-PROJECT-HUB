"""In-memory fake of the GitHub REST endpoints used by the hub."""
import base64
import json

import httpx

TOKEN = "ghp_" + "a" * 36

REPOS = {
    "octo/hub": {"id": 101, "name": "hub", "full_name": "octo/hub", "html_url": "https://github.com/octo/hub",
                 "description": "Hub repo", "private": False, "language": "Python", "default_branch": "main",
                 "topics": ["fastapi"], "stargazers_count": 3, "forks_count": 1, "open_issues_count": 2,
                 "pushed_at": "2026-11-10T10:00:00Z"},
    "octo/secret": {"id": 102, "name": "secret", "full_name": "octo/secret",
                    "html_url": "https://github.com/octo/secret", "description": None, "private": True,
                    "language": "Go", "default_branch": "main", "topics": [], "stargazers_count": 0,
                    "forks_count": 0, "open_issues_count": 0, "pushed_at": "2026-11-01T10:00:00Z"},
}


class FakeGithub:
    def __init__(self):
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.headers.get("authorization") != f"Bearer {TOKEN}":
            return httpx.Response(401, json={"message": "Bad credentials"})
        path = request.url.path
        if path == "/user":
            return httpx.Response(200, json={"login": "octo"}, headers={"x-oauth-scopes": "repo"})
        if path == "/user/repos":
            return httpx.Response(200, json=list(REPOS.values()))
        for full, data in REPOS.items():
            base = f"/repos/{full}"
            if path == base:
                return httpx.Response(200, json=data)
            if path == f"{base}/languages":
                return httpx.Response(200, json={data["language"]: 1000, "Dockerfile": 50})
            if path == f"{base}/readme":
                return httpx.Response(200, json={"encoding": "base64",
                                                 "content": base64.b64encode(b"# Hello").decode()})
            if path == f"{base}/contents/":
                return httpx.Response(200, json=[{"name": "requirements.txt", "type": "file"},
                                                 {"name": "Dockerfile", "type": "file"},
                                                 {"name": "src", "type": "dir"}])
            if path == f"{base}/commits":
                return httpx.Response(200, json=[
                    {"sha": "a" * 40, "html_url": "https://github.com/c/1",
                     "commit": {"message": "feat: first\n\nbody", "author": {"name": "Octo",
                                                                            "date": "2026-11-09T09:00:00Z"}}},
                ])
        return httpx.Response(404, json={"message": "Not Found"})

    @property
    def transport(self):
        return httpx.MockTransport(self.handler)


def dumps(x):
    return json.dumps(x)
