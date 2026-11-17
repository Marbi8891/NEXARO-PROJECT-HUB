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

## 6. Despliegue con GitHub

### Integración continua (GitHub Actions)

`.github/workflows/ci.yml` se ejecuta en cada push y pull request:

1. Tests del backend con un PostgreSQL de servicio, comprobando también que las migraciones coinciden con los modelos (`alembic check`).
2. Comprobación de sintaxis de todos los módulos JS del frontend.
3. Build de las dos imágenes Docker.

### Imágenes en GitHub Container Registry

`.github/workflows/publish.yml` publica, cuando CI pasa en `main` o al crear un tag `v*`:

- `ghcr.io/marbi8891/nexaro-hub-backend`
- `ghcr.io/marbi8891/nexaro-hub-frontend`

Para usar esas imágenes en cualquier servidor sin compilar:

```bash
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

Si el repositorio es privado, los paquetes también lo son: haz `docker login ghcr.io` con un token con permiso `read:packages`.

### GitHub Codespaces (la app en la nube con un clic)

En GitHub: **Code → Codespaces → Create codespace on main**. El contenedor:

1. Genera un `.env` con secretos aleatorios (solo dentro del Codespace).
2. Ejecuta `docker compose up -d --build`.
3. Abre el puerto 8080 en el navegador por HTTPS.

Por defecto el puerto es privado (solo tú, autenticado en GitHub). Si quieres enseñarlo a alguien, cambia la
visibilidad del puerto a *Public* en la pestaña **Ports**. El Codespace se apaga tras un tiempo sin uso; los datos
se conservan mientras no lo borres.
