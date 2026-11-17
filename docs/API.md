# API REST

Base: `/api`. JSON en entrada y salida. Con `NEXARO_ENV=development` hay documentación interactiva en `/api/docs`.

**Autenticación**: cookie `nexaro_session` (HttpOnly). Toda petición que no sea GET debe llevar la cabecera
`X-CSRF-Token` con el valor devuelto por `/auth/login`, `/auth/setup` o `/auth/me`.
Las escrituras requieren rol `owner`.

Errores: `{"detail": "..."}` con códigos 400, 401, 403, 404, 409, 422 (validación), 429 (rate limit), 502 (GitHub).

## Salud

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del backend y de la BD (sin autenticación) |

## Auth

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| GET | `/auth/setup` | — | `{needs_setup: bool}` |
| POST | `/auth/setup` | `{email, password(≥12)}` | `{user, csrf_token}` — solo si no hay usuarios |
| POST | `/auth/login` | `{email, password}` | `{user, csrf_token}` |
| POST | `/auth/logout` | — | 204 |
| GET | `/auth/me` | — | `{user, csrf_token}` |

## Proyectos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/projects` | Lista. Query: `q`, `category`, `status` (o `pending`), `priority`, `is_public`, `sort` (`updated`/`created`/`name`/`priority`), `limit`, `offset` → `{items, total}` |
| POST | `/projects` | Crea (`name` obligatorio; resto opcional) |
| GET | `/projects/{id}` | Detalle (incluye `repositories` y `open_tasks`) |
| PATCH | `/projects/{id}` | Actualización parcial |
| PUT | `/projects/{id}/status` | `{status: <estado> | null}` |
| DELETE | `/projects/{id}` | Borra el proyecto y sus tareas (no toca GitHub) |
| GET | `/projects/{id}/tasks` | Tareas |
| POST | `/projects/{id}/tasks` | `{title, status?, priority?, due_date?}` |
| PATCH | `/projects/{id}/tasks/{task_id}` | Actualización parcial |
| DELETE | `/projects/{id}/tasks/{task_id}` | Borra |

Valores:
- `category`: `artificial_intelligence`, `saas`, `web_development`, `cybersecurity`, `automation`, `developer_tools`, `education`, `ecommerce`, `research`, `other` o `null` (pendiente).
- `status`: `idea`, `planning`, `in_development`, `testing`, `production`, `maintenance`, `archived` o `null` (pendiente).
- `priority`: `low`, `medium`, `high`, `critical`.

## GitHub y repositorios

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/github/status` | `{connected, login, scopes, connected_at}` (nunca el token) |
| POST | `/github/connect` | `{token}` → valida contra GitHub y lo guarda cifrado |
| DELETE | `/github/connect` | Borra el token |
| GET | `/github/repos` | Repos accesibles en GitHub, marcando cuáles ya están importados |
| POST | `/github/import` | `{full_name: "owner/repo", project_id?}` → importa y sincroniza; sin `project_id` crea un proyecto «pendiente de verificar» |
| GET | `/repositories` | Repos importados |
| GET | `/repositories/{id}` | Detalle con README y últimos 30 commits |
| POST | `/repositories/{id}/sync` | Vuelve a leer metadatos, lenguajes, README, ficheros de dependencias y commits |
| PUT | `/repositories/{id}/project` | `{project_id | null}` vincular/desvincular |
| DELETE | `/repositories/{id}` | Borra la copia local (no toca GitHub) |

## Dashboard

`GET /dashboard` → `totals` (projects, active, completed, paused, production, pending_verification,
repositories, technologies, pending_tasks), `by_status`, `by_category`, `technologies`, `recent_commits`,
`recent_activity`, `attention`, `definitions`.

## Público (sin autenticación)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/public/projects` | Proyectos con `is_public=true` |
| GET | `/public/projects/{slug}` | Detalle público |

Campos públicos: `slug, name, summary, category, status, cover_url, demo_url, docs_url, github_url (solo si el repo es público), languages, frameworks, features, architecture`.
