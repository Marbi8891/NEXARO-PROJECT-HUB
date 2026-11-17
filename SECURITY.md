# Seguridad

## Implementado en el MVP

| Área | Medida |
| --- | --- |
| Contraseñas | Argon2id (`argon2-cffi`), mínimo 12 caracteres en el alta |
| Sesiones | Token aleatorio de 256 bits en cookie `HttpOnly`, `SameSite=Lax`, `Secure` configurable; en BD solo se guarda su hash SHA-256; caducan a las 12 h |
| CSRF | Token por sesión enviado en la cabecera `X-CSRF-Token` en toda petición que no sea GET (comparación en tiempo constante) |
| Enumeración de usuarios | Mismo mensaje y mismo coste de hash para usuario inexistente y contraseña errónea |
| Rate limiting | Login/setup: 5 intentos/min por IP. API: 300 peticiones/min por IP |
| Roles | `owner` (escritura) y `viewer` (solo lectura) en el modelo; todas las escrituras exigen `owner` |
| Validación | Pydantic v2 en todas las entradas: longitudes, enums, URLs `http(s)`, formato `owner/repo` |
| Auditoría | Logins (correctos y fallidos), cambios de proyectos, tareas, GitHub y repositorios |
| Token de GitHub | Se valida contra GitHub, se guarda cifrado con Fernet y **nunca** se devuelve al navegador |
| GitHub solo lectura | El cliente únicamente hace GET; un test verifica que no se envía ningún otro método |
| Portfolio | Endpoint aparte con lista blanca de campos; nunca expone notas, seguridad, tareas ni repos privados (tests incluidos) |
| XSS | El frontend inserta datos solo como texto; enlaces filtrados a `http(s)`; CSP `script-src 'self'` sin scripts inline |
| Cabeceras | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` en la API |
| Secretos | Solo en `.env` (ignorado por git). En producción el backend no arranca con la `NEXARO_SECRET_KEY` por defecto |
| Contenedores | Backend como usuario sin privilegios; backend y BD no publicados al exterior; frontend ligado a `127.0.0.1` |

## Recomendaciones de despliegue

- Sirve el Hub detrás de HTTPS (Caddy, Traefik o nginx con Let's Encrypt) y pon `NEXARO_COOKIE_SECURE=true`.
- Usa un token de GitHub *fine-grained* con permisos de solo lectura (Metadata + Contents) y fecha de caducidad.
- Si cambias `NEXARO_SECRET_KEY`, los tokens guardados dejan de poder descifrarse: vuelve a conectar GitHub.
- Haz copias de seguridad del volumen `pgdata` (`docker compose exec db pg_dump ...`).

## Pendiente (fases siguientes)

- Rate limiting compartido (Redis) si se usan varios workers.
- OAuth de GitHub en lugar de token personal.
- Escáner de repositorios con límites de tamaño/tiempo y sin ejecutar código (fase 6).
- Gestión de claves de Claude API / Ollama (fase 7) con el mismo cifrado que el token de GitHub.

## Informar de una vulnerabilidad

Abre un issue privado (Security advisory) en el repositorio o contacta con el propietario directamente.
