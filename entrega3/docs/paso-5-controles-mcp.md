# Paso 5 — Verificación de controles MCP y fallas

**Fecha:** 2026-11-08  
**Commit sugerido:** `test(entrega3): verificar errores y controles de MCP`

## Alcance

Se revisaron los escenarios de `evaluacion/matriz_integracion.md` y se añadieron pruebas automatizadas para el caso que estaba marcado como prueba manual: indisponibilidad de MCP o fallo del proveedor al atender una pregunta.

Las nuevas pruebas llaman directamente al endpoint de chat con fallas controladas. Verifican que:

- Si falla MCP al validar la sesión, la API responde HTTP 503 con el error comprensible y no invoca generación.
- Si la sesión es válida pero falla el proveedor, la API responde HTTP 503 con el error del proveedor; no produce una respuesta de éxito inventada.

La matriz de integración ahora enlaza IT-13 con esas pruebas. Mantiene señalado que la desconexión real de red debe probarse durante el ensayo visual de interfaz.

## Controles ya cubiertos por pruebas

La suite existente también verifica rechazo por rol no autorizado, bloqueo de solicitudes en casos aprobados automáticamente, límite de solicitudes y excepción de supervisor, confirmación de un solo uso e idempotencia, aislamiento entre organizaciones, lectura sin eventos de negocio, sanitización de identificadores personales e inmutabilidad de registros originales.

## Verificación

- Suite completa `entrega3/service/tests`: **25 pruebas aprobadas** (`25 passed in 4.62s`).
- `git diff --check`: sin errores.
- No se hizo ninguna llamada a Gemini, no se cambió la base de datos de demostración y no se creó ningún commit.

## Límites

Las pruebas con Gemini real y la interrupción de red del ensayo visual se mantienen como pruebas de ejecución manual. No se simulan como métricas reales del proveedor.
