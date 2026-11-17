#!/usr/bin/env bash
# Creates a .env with random secrets the first time the Codespace is built.
# The .env file stays inside the Codespace and is ignored by git.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  pg_pass=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')
  secret=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pg_pass}|" .env
  sed -i "s|^NEXARO_SECRET_KEY=.*|NEXARO_SECRET_KEY=${secret}|" .env
  # Codespaces serves forwarded ports over HTTPS, so the session cookie can be Secure.
  sed -i "s|^NEXARO_COOKIE_SECURE=.*|NEXARO_COOKIE_SECURE=true|" .env
  echo ".env created with random secrets"
fi

pip install --user -q -r backend/requirements-dev.txt
