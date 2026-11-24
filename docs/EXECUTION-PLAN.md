# Plan de ejecución del portfolio

**Fecha de creación:** 18/11/2026  
**Horizonte inicial:** 90 días (hasta el 16/02/2027)  
**Criterio de planificación:** priorizar entregas académicas y proyectos con código activo; limitar trabajo en paralelo. Este documento convierte la auditoría de los repositorios de Marbi8891 en una cola de trabajo. No implica que las tareas estén ya realizadas.

## Reglas de trabajo

1. Mantener como máximo **dos proyectos en desarrollo activo**: uno principal y uno secundario.
2. No iniciar funcionalidades nuevas mientras haya fallos de CI, regresiones o entregas académicas pendientes en el proyecto principal.
3. Toda tarea técnica debe terminar con pruebas ejecutadas, documentación actualizada y un resultado verificable.
4. Los repositorios auxiliares, vacíos o de documentación no cuentan como productos activos.
5. Revisar prioridades cada viernes y ajustar fechas según entregas reales.

## Prioridades del portfolio

| Prioridad | Proyecto | Próxima acción | Criterio de finalización |
|---|---|---|---|
| P0 | Python Learning Dashboard | Revisar las 28 incidencias abiertas; separar fallos reproducibles, dependabot y mejoras; resolver primero los fallos de CI de ramas activas. | CI verde en las ramas que se mantienen; tests backend y E2E ejecutados; issues clasificadas y backlog del TFG acotado. |
| P0 | NEXARO Projects Hub | Completar y validar el despliegue propuesto en PR #1; después registrar el portfolio real y su estado. | PR #1 integrado tras revisión; CI y publicación GHCR verificadas; Codespaces arranca; proyectos importados sin inventar metadatos. |
| P1 | NEXARO Projects Hub | Probar conexión GitHub real con token fine-grained de solo lectura y sincronización sobre repositorios propios. | Prueba real documentada; paginación, rate limits, errores y permisos mínimos comprobados; secretos nunca aparecen en logs. |
| P1 | ProgramaDAW | Añadir CI para lint, typecheck, tests y build; volver a ejecutar los checks del proyecto. | Workflow obligatorio verde en PR; instrucciones de ejecución local documentadas. |
| P1 | Oposiciones C1 Estado | Revisar temario y tests frente a la convocatoria vigente; corregir contenidos desactualizados. | Cada tema tiene fuente/fecha de revisión; tests vinculados al temario; despliegue de Pages verificado. |
| P1 | NEXARO AI (leads/CRM) | Revisar el MVP y completar una prueba funcional de captación, persistencia y seguimiento de leads. | Flujo lead→base de datos→panel probado; migraciones y tests verdes; integraciones externas identificadas como activas o pendientes. |
| P2 | TOR-OSINT | Investigar el fallo de integración Docker/Tor con el servicio onion de prueba; mantener separada la matriz Python que ya pasa. | Causa reproducida y documentada; integración estable o test marcado explícitamente como dependiente de red externa; CI completa verde. |
| P2 | OWASP Web Auditor | Añadir CI para build, typecheck, lint y tests del monorepo. | Pipeline obligatorio verde; reglas de escaneo con tests de regresión y documentación de límites. |
| P2 | NEXARO ERP | Completar revisión del motor contable y preparar una interfaz mínima antes de ampliar módulos. | Tests de partida doble, permisos, aislamiento y cierres fiscales verdes; revisión funcional documentada. No usar para contabilidad real sin validación profesional. |
| P2 | NEXARO Agency | Revisar contratos, permisos y evidencias de los agentes; distinguir agentes definidos de agentes desplegados. | Matriz agente→permisos→aprobación→evidencia actualizada; validaciones automatizadas verdes. |
| P3 | NEXARO Personal AI | Incorporar una implementación ejecutable al repositorio o declarar claramente que es un repositorio de especificación. | README indica alcance real; si hay código, arranque reproducible, tests y límites de privacidad documentados. |
| P3 | FastAPI SaaS Ecommerce | Reabrir el proyecto solo tras ejecutar instalación, migraciones y tests desde un entorno limpio. | Arranque reproducible y suite mínima verde; dependencias y estado del producto documentados. |
| P3 | Portfolio Mrabeh | Consolidar portfolio profesional y eliminar o automatizar copias duplicadas de otros proyectos. | Despliegue verificado; enlaces comprobados; repositorios fuente enlazados en lugar de copias sin mantenimiento. |
| P3 | NEXARO Landing | Decidir si se integra en el portfolio/Hub o se mantiene como landing independiente. | Decisión documentada y enlaces/despliegue comprobados. |
| P3 | Mapa Electoral Madrid | Mantener solo si hay un objetivo de uso claro; añadir pruebas básicas de datos y filtros si continúa. | Datos y fuentes documentados; validación de las 21 demarcaciones y ubicaciones que declara el proyecto. |

## Calendario de 90 días

### Bloque 1 — 18/11 a 01/12: estabilización
- [ ] Python Learning Dashboard: clasificar issues y corregir fallos reproducibles de CI en ramas activas.
- [ ] Python Learning Dashboard: cerrar una lista concreta de entregables del TFG y congelar nuevas funcionalidades.
- [ ] NEXARO Projects Hub: revisar PR #1 y comprobar CI, imágenes GHCR y Codespaces tras la integración.
- [ ] NEXARO Projects Hub: cargar el inventario de repositorios con estado «pendiente de verificar» cuando falten datos.

**Salida del bloque:** PLD estable para continuar el TFG; Hub desplegable y con inventario inicial fiable.

### Bloque 2 — 02/12 a 29/12: integraciones y formación
- [ ] NEXARO Projects Hub: probar API real de GitHub con permisos mínimos y documentar límites.
- [ ] ProgramaDAW: incorporar CI y validar build/tests.
- [ ] Oposiciones C1: revisar el siguiente conjunto de temas y preguntas de test.
- [ ] NEXARO AI: ejecutar una prueba completa del flujo de leads.

**Salida del bloque:** integración GitHub real probada; dos proyectos formativos con validaciones automatizadas.

### Bloque 3 — 30/12 a 26/01: seguridad y producto
- [ ] TOR-OSINT: resolver o aislar el fallo de integración Tor.
- [ ] OWASP Web Auditor: CI completa y pruebas de regresión.
- [ ] NEXARO ERP: revisión funcional del núcleo contable y lista de brechas antes de frontend.
- [ ] NEXARO Agency: auditar permisos y aprobaciones de agentes.

**Salida del bloque:** dos proyectos de ciberseguridad con CI verificable y ERP con alcance de MVP definido.

### Bloque 4 — 27/01 a 16/02: consolidación
- [ ] NEXARO Projects Hub: priorizar scanner seguro de repositorios; no ejecutar código importado.
- [ ] NEXARO Personal AI: decidir e implementar el alcance mínimo ejecutable.
- [ ] Portfolio: consolidar enlaces y retirar duplicaciones que no aporten.
- [ ] Revisar el plan completo, cerrar tareas terminadas y fijar el siguiente ciclo.

**Salida del bloque:** Hub como panel de seguimiento fiable y cartera reducida a proyectos con siguiente acción clara.

## Definición de terminado

Una tarea solo se cierra cuando:
- el cambio está en la rama principal mediante PR revisada;
- las pruebas relevantes pasan y se indica qué se ejecutó;
- la documentación refleja el comportamiento actual;
- no quedan secretos, datos personales ni credenciales en el repositorio;
- el resultado se puede reproducir siguiendo las instrucciones del proyecto.

## Riesgos y límites conocidos

- La integración GitHub del Hub estaba cubierta con simulación; la conexión real a api.github.com no estaba verificada en la auditoría.
- En TOR-OSINT, la matriz Python 3.10–3.14 pasó; el fallo observado estaba en el paso de crawl del servicio onion dentro de Docker/Tor.
- En NEXARO Personal AI, el repositorio inspeccionado contenía documentación, no una aplicación completa en el directorio raíz. El prototipo FastAPI mencionado en conversaciones no se considera parte del repositorio hasta comprobarlo.
- Los estados y criterios de este plan son una propuesta de trabajo basada en la auditoría del 18/11/2026. Deben actualizarse cuando se verifiquen los repositorios en ejecución.
