# Arquitectura

```
Navegador ──► nginx (frontend, :8080) ──/api/*──► FastAPI (backend, :8000) ──► PostgreSQL
                │ sirve HTML/CSS/JS estáticos           │
                │ cabeceras de seguridad + CSP          └──► api.github.com (solo GET)
```

- **nginx** sirve el frontend estático y hace de proxy de `/api/` al backend. Al ser el mismo origen,
  la cookie de sesión funciona sin CORS.
- **FastAPI** expone la API REST. El backend no está publicado fuera de la red de Docker.
- **PostgreSQL** guarda todo; el volumen `pgdata` lo hace persistente.

## Backend (`backend/app`)

| Fichero | Responsabilidad |
| --- | --- |
| `config.py` | Configuración desde variables de entorno `NEXARO_*` |
| `db.py` | Engine y sesiones de SQLAlchemy |
| `models.py` | Modelos ORM y enums |
| `schemas.py` | Contratos Pydantic de entrada y salida |
| `security.py` | Hash de contraseñas (Argon2), sesiones, CSRF, rate limit, cifrado de tokens, auditoría |
| `routers/auth.py` | Setup inicial, login, logout, `me` |
| `routers/projects.py` | CRUD de proyectos, estado, tareas |
| `routers/github.py` | Conexión GitHub, listado, importación, sincronización, repositorios locales |
| `routers/dashboard.py` | Métricas del Overview calculadas desde la BD |
| `routers/public.py` | API pública del portfolio (sin autenticación, campos en lista blanca) |
| `services/github_client.py` | Cliente GitHub **solo lectura** (únicamente peticiones GET) |
| `seed.py` | Alta idempotente de los 7 proyectos iniciales |

### Modelo de datos

- **users**: `email`, `password_hash` (Argon2), `role` (`owner`/`viewer`).
- **sessions**: `token_hash` (SHA-256 del token de la cookie), `csrf_token`, `expires_at`, ip, user agent.
- **projects**: nombre, slug, descripción, `category` y `status` (NULL = pendiente), prioridad, `is_paused`,
  `info_verified`, URLs (portada, demo, docs), listas JSON (lenguajes, frameworks, dependencias, funcionalidades),
  fecha de inicio, versión, arquitectura, **notas privadas** (`dev_notes`, `security_notes`), `is_public`, `public_summary`.
- **tasks**: tarea por proyecto con estado (`todo`/`in_progress`/`done`), prioridad y fecha límite.
- **repositories**: copia local de metadatos de GitHub vinculada (opcionalmente) a un proyecto.
- **commits**: últimos commits sincronizados por repositorio (únicos por `repository_id + sha`).
- **github_credentials**: login y token **cifrado** (Fernet, clave derivada de `NEXARO_SECRET_KEY`).
- **audit_logs**: acción, entidad, resumen, ip, fecha. Alimenta «Actividad reciente».

### Definiciones de las métricas

- *Activos*: estado planning / in_development / testing y no pausado.
- *Completados*: estado production / maintenance.
- *En pausa*: marcado como pausado por el propietario.
- *Requieren atención*: datos pendientes de verificar, tareas vencidas, proyecto activo sin cambios en 30 días,
  o proyecto activo/completado sin repositorio vinculado.

## Frontend (`frontend/`)

SPA sin framework con router por hash (`#/projects/3`).

| Ruta | Contenido |
| --- | --- |
| `js/main.js` | Arranque, shell (sidebar/topbar), router |
| `js/api.js` | `fetch` con cookie de sesión y cabecera `X-CSRF-Token` |
| `js/ui/dom.js` | `h()` crea nodos de forma segura (nunca `innerHTML` con datos), iconos, fechas |
| `js/ui/components.js` | Badges, tarjetas de métricas, estados vacíos/error, modal, toasts, campos |
| `js/views/*.js` | Una vista por sección |
| `js/portfolio.js` | Portfolio público (solo `/api/public`) |
| `css/tokens.css` | Variables de diseño para tema oscuro y claro |
| `vendor/` | Chart.js y Lucide copiados (licencias MIT/ISC incluidas) |

Secciones aún no implementadas (Desarrollo, Documentación, AI Analyst, Claude Code Workspace, Analytics)
muestran un estado vacío que indica su fase; no muestran datos simulados.
