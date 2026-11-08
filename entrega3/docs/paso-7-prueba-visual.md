# Paso 7 — Prueba visual del asistente

**Fecha:** 2026-11-08  
**Commit sugerido:** `test(entrega3): validar flujo visual del asistente`

## Alcance y entorno

Se recorrió `/asistente` en un navegador con `LLM_PROVIDER=demo`, usando una base SQLite y un índice Chroma temporales bajo el directorio de sesión. El flujo no usó Gemini ni modificó los datos de Entrega 3. La solicitud de D5 se confirmó únicamente en esa base temporal.

## Escenarios comprobados

| Evidencia | Resultado observado |
|---|---|
| D1 — Pregunta por un caso | Respuesta con estado `evidencia`, citas desplegables con fuente, sección, versión y vigencia, más traza de `consultar_caso`, `listar_senales` y `buscar_reglas`. |
| D2 — Pregunta sin respaldo | Estado `abstencion`; declara que el corpus no contiene la información y pide una fuente validada. |
| D3 — Conflicto 80/85 | Estado `conflicto`; muestra POL-DEC v2 y MAN-REV v1 como incompatibles y vigentes. |
| D4 — Cambio de versión | La respuesta permite contrastar la regla de fraude derogada en v1 con la vigente en v2. |
| D5 — Confirmación humana | La solicitud se preparó sin escribir; el botón de confirmación la registró después de la acción explícita. |
| D6 — Guardrail | La tercera solicitud de C-016 fue rechazada para U-01; la interfaz informó que debe registrarla un supervisor y que no hubo escritura. |
| D7 — Cliente MCP | `mira_cu1.cli_client consultar_caso` leyó C-013 por Streamable HTTP. |
| D8 — Pregunta imprevista | Respondió con estado `evidencia`, citas y traza; identificó que el resultado provenía del modo demo. |
| IT-13 — MCP detenido | La interfaz mostró `Servicio no disponible` y el detalle del fallo de conexión; la API respondió 503. |

Se verificó además que las citas y trazas se pueden expandir y muestran el texto de fuente y las herramientas ejecutadas.

## Observaciones de uso

- Abrir el frontend en `http://localhost:3000` coincide con el origen CORS predeterminado. Usar `127.0.0.1:3000` requiere configurar ese origen explícitamente; la discrepancia durante la preparación fue del entorno de prueba, no un fallo del endpoint con su origen configurado.
- Las citas muestran el Markdown original (incluidos encabezados `##`), pero el texto y sus referencias siguen siendo legibles.
- Este recorrido es una verificación funcional aislada, no una evaluación de generación ni un ensayo cronometrado de la presentación. Gemini y el ensayo oral completo siguen pendientes.

## Verificación y cierre

- La base y el índice de prueba se prepararon correctamente con los seis documentos del corpus.
- Se confirmó que las métricas de generación no se midieron con el modo demo.
- Los servicios de prueba se detuvieron y los datos temporales se limpiaron.
- No se modificó código de la aplicación ni se creó ningún commit.

## Siguiente pendiente

Configurar Gemini localmente, ejecutar las 20 preguntas del Golden Set y revisar manualmente las respuestas y citas. No compartas la clave en el chat ni la guardes en Git.
