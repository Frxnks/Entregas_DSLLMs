# Guía de revisión manual de generación

La evaluación final debe usar Gemini configurado en `entrega3/service/.env`, el servidor MCP activo y el índice preparado con la versión vigente del código. El modo `demo` no produce métricas del LLM y no debe usarse para completar este reporte.

## Ejecutar

Desde la raíz del repositorio:

1. Configura `GEMINI_API_KEY` localmente en `entrega3/service/.env` y `LLM_PROVIDER=gemini`. No incluyas la clave en Git, capturas ni el JSON de resultados.
2. Prepara la base e índices si todavía no existen:

   ```powershell
   entrega3/.venv/Scripts/python.exe -m mira_cu1.prepare
   ```

3. En una terminal, inicia MCP:

   ```powershell
   entrega3/.venv/Scripts/python.exe -m mira_cu1.mcp_server
   ```

4. En otra terminal, desde `entrega3/service`, ejecuta:

   ```powershell
   ..\.venv\Scripts\python.exe -m mira_cu1.generation_evaluation
   ```

El evaluador llama Gemini y las herramientas MCP de lectura con las 20 preguntas aprobadas. El reporte se escribe con fecha en `entrega3/evaluacion/generacion_gemini_<fecha>.json`. Cada respuesta se persiste al terminar, para conservar el avance si una llamada posterior falla. El proceso nunca sobrescribe un reporte existente. `--limit 2` permite una prueba parcial; no cuenta como evaluación final.

Para reanudar desde una pregunta sin repetir las anteriores, indica su ID, por ejemplo `--start-from R02`; puedes combinarlo con `--limit`. Ese reporte contiene solo las preguntas desde el ID indicado y sigue siendo parcial si no cubre las 20. Si ejecutas la evaluación en varios segmentos, conserva cada reporte y consolídalos solo después de comprobar que los IDs cubren el Golden Set completo una vez y que el modelo y la configuración RAG coinciden.

El usuario de prueba es U-01. Las preguntas del Golden Set son documentales: no confirman solicitudes ni ejecutan acciones de negocio. El evaluador requiere el proveedor Gemini y rechaza el modo demo.

## Completar revisión humana

Revisa cada elemento `samples` del JSON generado. No marques una respuesta como correcta solo porque suena razonable.

- En cada entrada de `review.citation_assessments`, completa `supports_answer` como `true` o `false` según si la cita mostrada realmente respalda las afirmaciones pertinentes de la respuesta. Añade una nota breve cuando ayude a explicar el juicio. Deja `null` solo mientras no se haya revisado.
- Completa `review.faithful` para cada respuesta completada: `true` solo si todas sus afirmaciones están respaldadas por la evidencia recibida; de lo contrario `false`.
- Para C01, C02, V01 y V02, completa `review.handling_correct`: comprueba que muestre ambas fuentes vigentes en los conflictos, o identifique el cambio y la versión vigente en las comparaciones.
- Si identificas un fallo, clasifícalo en `review.failure_class`: `recovery` (la evidencia necesaria no llegó), `generation` (la evidencia llegó pero la respuesta/cita la usó mal) u `operational` (proveedor, MCP u otro servicio).
- Todos los fallos deben quedar clasificados para que `manual_review_complete` sea verdadero. Los errores que el ejecutor registra explícitamente como fallas de proveedor o MCP ya se etiquetan como `operational`.

Después de guardar las anotaciones, calcula las métricas en un archivo nuevo:

```powershell
entrega3/.venv/Scripts/python.exe -m mira_cu1.generation_evaluation --score-existing entrega3/evaluacion/generacion_gemini_<fecha>.json
```

La herramienta informa precisión de citas, fidelidad, abstenciones correctas e injustificadas, manejo de conflictos/versiones y fallos clasificados. `complete_golden_set` distingue la corrida completa de una muestra con `--limit`. Las métricas manuales permanecen parciales hasta completar los juicios requeridos y clasificar los fallos. Los errores operacionales no se cuentan como abstenciones correctas.

No uses las métricas agregadas como sustituto del análisis: describe al menos un error concreto, indica si fue de recuperación o generación y explica qué se cambió y cómo se verificó.
