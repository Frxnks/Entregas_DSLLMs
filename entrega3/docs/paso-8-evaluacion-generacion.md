# Paso 8 — Recuperación MCP obligatoria y evaluación de generación

**Fecha:** 2026-11-08  
**Commit sugerido:** `fix(entrega3): asegurar recuperación y evaluar Golden Set`

## Alcance

La primera prueba autorizada de R01 mostró que Gemini podía responder sin llamar MCP ni devolver citas. Se ajustó el proveedor para buscar reglas antes de generar la respuesta y pasar los resultados sanitizados al modelo como evidencia no confiable. La búsqueda también queda en la traza y sus fragmentos se muestran como citas aunque Gemini no solicite herramientas.

Después se ejecutó el Golden Set completo con `gemini-flash-lite-latest`, `RAG_TOP_K=5` y un servidor MCP con base e índice aislados fuera del repositorio. R01, ya ejecutada tras el cambio, no se repitió: el evaluador se amplió con `--start-from` y las 19 preguntas restantes se ejecutaron en R02 y R03–V02. La última verificación disponible de AI Studio mostraba el nivel gratuito y no se activó facturación. La clave permaneció en `entrega3/service/.env`, ignorada por Git; no se mostró ni se guardó en el reporte.

## Resultado del Golden Set

- Las 20 preguntas terminaron sin errores operacionales. El reporte [generacion_gemini_20261108_r01-r20.json](../evaluacion/generacion_gemini_20261108_r01-r20.json) conserva las respuestas, citas, trazas y anotaciones pendientes.
- Cada respuesta muestra evidencia recuperada por MCP antes de generar; el reporte contiene 100 citas sin revisar.
- R01 respondió correctamente que el asistente no aprueba ni rechaza casos y citó FAQ-OPE v2, la evidencia esperada. Aun así, tres de sus cinco citas parecen ajenas a la pregunta. La precisión de citas requiere revisión humana.
- V02 se abstuvo porque los fragmentos recuperados no bastaban para comparar el cambio de umbral entre versiones. Queda como fallo pendiente de clasificar, probablemente de recuperación.
- El cálculo automático preliminar detecta cuatro abstenciones correctas de cuatro preguntas sin respuesta en el corpus y una abstención injustificada (V02). Son señales para la revisión, **no métricas finales**.
- La revisión humana de fidelidad (20 respuestas), pertinencia de citas (100) y manejo de conflictos/versiones (4 preguntas) sigue pendiente; `manual_review_complete=false`.

## Cambios y validación

- `service/mira_cu1/provider.py`: hace la búsqueda RAG vía MCP antes de llamar a Gemini; sanitiza el resultado y lo agrega como contexto explícitamente no confiable. Conserva búsqueda, resultados y citas para la interfaz.
- `service/mira_cu1/generation_evaluation.py`: añade `--start-from` para reanudar una evaluación sin repetir preguntas ya ejecutadas.
- `service/tests/test_gemini_provider.py` y `service/tests/test_generation_evaluation.py`: comprueban recuperación/citas y selección de preguntas sin llamadas externas.
- Pruebas: `28 passed` en `entrega3/service/tests`.

## Siguiente paso

Completar la revisión manual descrita en `evaluacion/guia_revision_generacion.md`, empezando por V02 y las citas que no respaldan directamente la pregunta. No presentar los conteos automáticos como métricas finales hasta que las anotaciones estén completas.
