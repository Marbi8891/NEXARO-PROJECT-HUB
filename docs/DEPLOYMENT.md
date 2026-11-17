# Despliegue con Docker Compose

## 1. Configuración

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"   # pégalo en NEXARO_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(24))"   # pégalo en POSTGRES_PASSWORD
```

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Sí | Contraseña de PostgreSQL |
| `NEXARO_SECRET_KEY` | Sí | Clave para cifrar tokens de GitHub |
| `POSTGRES_DB`, `POSTGRES_USER` | No | Por defecto `nexaro` |
| `NEXARO_ENV` | No | `production` (por defecto, oculta `/api/docs`) o `development` |
| `NEXARO_COOKIE_SECURE` | No | `true` cuando se sirve por HTTPS |
| `NEXARO_SEED_INITIAL_PROJECTS` | No | Crea los 7 proyectos iniciales (por defecto `true`) |
| `HUB_PORT` | No | Puerto local (por defecto `8080`) |

## 2. Arranque

```bash
docker compose up -d --build
docker compose ps        # los tres servicios deben aparecer "healthy"
```

Al arrancar, el backend ejecuta `alembic upgrade head` y el seed (idempotente) antes de levantar uvicorn.

Abre <http://localhost:8080> y crea la cuenta de propietario.

## 3. Operación

```bash
docker compose logs -f backend                         # logs
docker compose exec db pg_dump -U nexaro nexaro > backup.sql   # copia de seguridad
docker compose pull && docker compose up -d --build    # actualizar
docker compose down                                    # parar (los datos se conservan)
docker compose down -v                                 # parar y BORRAR la base de datos
```

## 4. Health checks

- `db`: `pg_isready`
- `backend`: `GET /api/health` → `{"status":"ok","database":"ok"}`
- `frontend`: petición a `/`

## 5. Exponerlo a Internet

El puerto está ligado a `127.0.0.1`. Para publicarlo, pon delante un proxy con HTTPS
(por ejemplo Caddy: `reverse_proxy localhost:8080`) y activa `NEXARO_COOKIE_SECURE=true`.
