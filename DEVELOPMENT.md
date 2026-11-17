# Desarrollo

## Requisitos

- Python 3.12+
- PostgreSQL 16 (o Docker para levantar solo la base de datos)
- Node.js solo si quieres ejecutar pruebas E2E con Playwright (opcional)

## Backend y frontend en local, sin Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

# Base de datos (ejemplo con Docker solo para Postgres)
docker run -d --name nexaro-pg -e POSTGRES_USER=nexaro -e POSTGRES_PASSWORD=nexaro \
  -e POSTGRES_DB=nexaro -p 5432:5432 postgres:16-alpine

export NEXARO_DATABASE_URL=postgresql+psycopg://nexaro:nexaro@localhost:5432/nexaro
export NEXARO_ENV=development
export NEXARO_FRONTEND_DIR=$(pwd)/../frontend   # FastAPI sirve también el frontend

alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

Abre <http://localhost:8000>. Swagger: <http://localhost:8000/api/docs>.

## Tests

Los tests usan una base de datos PostgreSQL separada (se borra y recrea en cada test):

```bash
createdb -h localhost -U nexaro nexaro_test     # una sola vez
cd backend
NEXARO_DATABASE_URL=postgresql+psycopg://nexaro:nexaro@localhost:5432/nexaro_test pytest
```

GitHub se simula con `httpx.MockTransport` (`tests/fake_github.py`): los tests nunca llaman a la API real
y comprueban que el Hub solo hace peticiones `GET`.

## Migraciones

```bash
# tras cambiar app/models.py
alembic revision --autogenerate -m "describe el cambio"
# revisa el fichero generado en alembic/versions/ y luego:
alembic upgrade head
alembic check   # debe decir "No new upgrade operations detected"
```

## Convenciones

- Código e identificadores en inglés; interfaz y documentación en español.
- Frontend: nunca usar `innerHTML` con datos; usar `h()` de `js/ui/dom.js`.
- Cada acción que modifica datos se registra con `audit()`.
- No se generan estadísticas falsas: si no hay datos, se muestra un estado vacío.
- Datos no verificados: dejar el campo vacío (= «Pendiente») en lugar de inventarlo.
