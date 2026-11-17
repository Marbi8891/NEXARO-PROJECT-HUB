# NEXARO Projects Hub

Plataforma central para gestionar, monitorizar, documentar y mostrar todos tus proyectos de software.

> Estado: **MVP (v0.1.0)**. Ver qué está hecho y qué falta en [docs/AUDIT.md](docs/AUDIT.md).

## Qué incluye el MVP

- Autenticación con cuenta de propietario (sesión segura con cookie HttpOnly + CSRF).
- Dashboard con métricas reales (sin datos inventados), gráficos por estado y categoría,
  proyectos que requieren atención, commits recientes y actividad.
- Registro de proyectos: alta manual, edición, borrado, perfil completo, tareas básicas.
- Búsqueda, filtros (categoría, estado, prioridad) y ordenación; vista en tarjetas o tabla.
- Gestión de estados: IDEA, PLANNING, IN DEVELOPMENT, TESTING, PRODUCTION, MAINTENANCE, ARCHIVED (+ «Pendiente»).
- GitHub: conexión con token de solo lectura (cifrado en servidor), listado, importación y sincronización
  de repositorios (metadatos, README, lenguajes, ficheros de dependencias, últimos commits).
- Portfolio público separado (`/portfolio.html`) que solo muestra los proyectos marcados como públicos.
- Tema oscuro / claro, sidebar plegable, diseño responsive y accesible.
- Despliegue con Docker Compose (PostgreSQL + FastAPI + nginx) con health checks.

Los 7 proyectos iniciales (Python Learning Dashboard, NEXARO Personal AI, NEXARO Network Intelligence,
CS Mentor, Excel Academy, AI Commerce Operating System, Claude Architect Academy) se crean **solo con el nombre**
y marcados como *pendiente de verificar*: descripción, categoría, estado y repositorio quedan vacíos hasta que los completes.

## Arranque rápido (Docker)

```bash
cp .env.example .env
# Edita .env: pon POSTGRES_PASSWORD y NEXARO_SECRET_KEY (valores largos y aleatorios)
docker compose up -d --build
```

Abre <http://localhost:8080>. La primera vez te pedirá crear la cuenta de propietario.
Más detalles en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentación

| Documento | Contenido |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura, modelos de datos, flujo de peticiones |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Entorno local sin Docker, tests, migraciones, convenciones |
| [SECURITY.md](SECURITY.md) | Modelo de seguridad y buenas prácticas |
| [docs/API.md](docs/API.md) | Referencia de la API REST |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Despliegue con Docker Compose |
| [docs/AUDIT.md](docs/AUDIT.md) | Auditoría inicial y hoja de ruta por fases |

## Stack

Frontend: HTML5, CSS3, JavaScript ES Modules, Chart.js, Lucide · Backend: Python 3.12, FastAPI, Pydantic v2,
SQLAlchemy 2, Alembic, PostgreSQL · Infra: Docker, Docker Compose, nginx · Tests: Pytest (+ pruebas E2E con Playwright).
