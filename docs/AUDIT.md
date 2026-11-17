# Auditoría técnica inicial y hoja de ruta

Fecha: 17/11/2026

## 1. Inspección del repositorio

- No existía ningún repositorio de NEXARO Projects Hub. En la cuenta de GitHub `Marbi8891` hay otros repos
  NEXARO (`NEXARO-PERSONAL-AI-`, `NEXARO-ERP`, `nexaro-agency`, `nexaro-landing`, `nexaro-ai`), pero ninguno
  es el Hub. **No se ha migrado ni reutilizado código de ellos.**
- Por tanto el proyecto arranca desde cero con el stack fijado en la especificación.
- Funcionalidad existente previa: ninguna.

## 2. Decisiones de arquitectura (resumen; detalle en `ARCHITECTURE.md`)

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Frontend | HTML + CSS + JS ES Modules sin framework, SPA con router por hash | Requisito; sin build step |
| Librerías | Chart.js 4.4.6 y Lucide 0.460.0 **copiadas en `frontend/vendor/`** | CSP estricta `script-src 'self'`, sin dependencia de CDN |
| Backend | FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic | Requisito |
| Base de datos | PostgreSQL 16; enums guardados como texto | Migraciones más simples que los ENUM nativos |
| Autenticación | Sesión en servidor + cookie HttpOnly SameSite=Lax + token CSRF | Más segura que JWT en localStorage para una app web |
| GitHub | Token personal (fine-grained, solo lectura) cifrado con Fernet | OAuth App requiere registrar app y callback público: se deja para una fase posterior |
| Datos dudosos | `category`/`status` pueden ser NULL = «Pendiente»; flag `info_verified` | La especificación prohíbe inventar datos |

## 3. Modelos de datos

`users`, `sessions`, `projects`, `tasks`, `repositories`, `commits`, `github_credentials`, `audit_logs`.
Detalle de columnas en `ARCHITECTURE.md` y en `backend/app/models.py`.

## 4. Endpoints

Ver `docs/API.md` (y Swagger en `/api/docs` con `NEXARO_ENV=development`).

## 5. Componentes de frontend

Shell (sidebar plegable, topbar, menú móvil), tarjetas de métricas, badges de estado/categoría/prioridad,
tablas, tabs accesibles, modal con `<dialog>`, toasts, estados vacíos/error/carga, formulario de proyecto,
gráficos Chart.js con tabla de datos alternativa.

## 6. Hoja de ruta

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Inspección y auditoría | ✅ Hecho |
| 2 | Diseño de BD, backend y contratos API | ✅ Hecho |
| 3 | Sistema de diseño y dashboard responsive | ✅ Hecho |
| 4 | Registro de proyectos y CRUD (incl. tareas básicas) | ✅ Hecho |
| 5 | GitHub: conexión, listado, importación, sincronización (metadatos, README, lenguajes, commits, ficheros de dependencias) | ✅ Hecho (releases, issues y PRs: pendiente) |
| 6 | Escáner de repositorios seguro (sin ejecutar código) | ⏳ Pendiente |
| 7 | AI Project Analyst (Claude API + Ollama) | ⏳ Pendiente |
| 8 | Claude Code Workspace | ⏳ Pendiente |
| 9 | Analytics avanzada y portfolio | 🟡 Portfolio público básico hecho; analytics avanzada pendiente |
| 10 | Kanban, roadmaps, hitos, documentación, OAuth GitHub, despliegue HTTPS | ⏳ Pendiente |

## 7. Problemas conocidos / pendientes

- El rate limiting es en memoria y por proceso: correcto con 1 worker; con varios workers o réplicas hay que moverlo a Redis.
- La conexión a GitHub es con token personal; OAuth queda para fase 10.
- El README se muestra como texto plano (no se renderiza Markdown todavía, por seguridad y simplicidad).
- Un solo usuario propietario; el rol `viewer` existe en el modelo pero no hay gestión de usuarios en la UI.
- La conexión real con api.github.com no se ha podido probar desde el entorno de desarrollo en la nube
  (red restringida); está cubierta con un GitHub simulado en tests y en pruebas de navegador.
