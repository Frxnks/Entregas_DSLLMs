# Paso 4 — Preparación de evaluación de generación

**Fecha:** 2026-11-08  
**Commit sugerido para el ejecutor y la guía:** `feat(entrega3): agregar evaluador reproducible de generación`

## Estado

El ejecutor y el protocolo de revisión manual están implementados. **La evaluación real de Gemini no está ejecutada y este paso no queda cerrado**: al revisar el entorno no se encontró `entrega3/service/.env`, `GEMINI_API_KEY` ni `GOOGLE_API_KEY`. No se usó el modo demo, no se contactó a Gemini y no se inventaron métricas.

Nikolas ya validó las 20 preguntas sin cambios. La corrida semántica de recuperación se hizo con Chroma; este paso separa la medición de generación de esa métrica de retrieval.

## Qué se preparó

- `service/mira_cu1/generation_evaluation.py` recorre las 20 preguntas aprobadas usando el proveedor Gemini y herramientas MCP. Crea una sesión de lectura U-01 y no confirma acciones.
- El ejecutor guarda el modelo, estado, respuesta, citas y trazas por pregunta. Escribe progreso después de cada muestra y nunca sobrescribe un reporte o archivo temporal ya existente.
- Rechaza explícitamente `LLM_PROVIDER=demo` y la ausencia de clave; `--limit` solo permite una prueba parcial, que no puede confundirse con el Golden Set completo.
- El mismo módulo calcula métricas después de que una persona complete las anotaciones manuales, y exige clasificar los fallos como recuperación, generación u operación.
- `evaluacion/guia_revision_generacion.md` explica la configuración local, la ejecución, cómo revisar respuestas y cómo calcular las métricas.

## Métricas que reportará la evaluación

- Precisión de citas: citas revisadas que respaldan las afirmaciones, dividido por citas revisadas.
- Fidelidad: respuestas revisadas cuyas afirmaciones están todas respaldadas por la evidencia recibida.
- Abstención: tasa correcta para las cuatro preguntas sin respuesta y tasa de abstención injustificada para las 16 respondibles.
- Conflicto/vigencia: aciertos revisados en C01, C02, V01 y V02.
- Clasificación de fallos: recuperación, generación u operación; los errores del proveedor/MCP no se cuentan como abstenciones correctas.

La precisión de citas y la fidelidad requieren anotación humana; el script no las presenta como medidas automáticas. Si se usa un evaluador automático en una etapa posterior, la pauta requiere revisar manualmente una muestra e informar concordancia.

## Verificación realizada

- `python -m pytest entrega3/service/tests`: **23 pruebas aprobadas**.
- La CLI `python -m mira_cu1.generation_evaluation --help` funciona.
- Se probó que, sin `GEMINI_API_KEY`, la ejecución se detiene con un error explícito y no crea un reporte de resultados.
- No hubo llamadas externas a Gemini ni MCP durante esta preparación.
- No se creó ningún commit.

## Para completar el paso

1. Configura la clave tú mismo en `entrega3/service/.env` (no me la envíes ni la guardes en el repositorio) y confirma `LLM_PROVIDER=gemini`.
2. Comprueba que la base e índices estén preparados y levanta el servidor MCP, siguiendo `evaluacion/guia_revision_generacion.md`.
3. Ejecuta las 20 preguntas sin `--limit`, revisa manualmente las respuestas y completa las anotaciones del JSON generado.
4. Genera las métricas finales con `--score-existing` y documenta al menos un fallo concreto, su categoría y su corrección verificada.

Hasta completar esas acciones, los resultados de generación siguen **pendientes**. El commit sugerido arriba cubre el ejecutor, su prueba y la guía; no convierte la evaluación del modelo en terminada.
