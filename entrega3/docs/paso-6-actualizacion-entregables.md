# Paso 6 — Actualización del informe y la presentación

**Fecha:** 2026-11-08  
**Commit sugerido:** `docs(entrega3): actualizar resultados del informe y presentación`

## Alcance

Se alinearon el informe y la presentación con el estado verificado después de los pasos 2 a 5:

- Golden Set confirmado por Nikolas el 8 de noviembre.
- Recuperación semántica con `k = 5`: Recall 0,875 por pregunta y 0,90 por evidencia para ambas estrategias.
- Fallos de recuperación aún visibles en C01 y V02.
- Suite Python de Entrega 3 con 25 pruebas aprobadas.
- Evaluación de generación real con Gemini todavía pendiente; no se inventaron resultados.

Se actualizó el informe fuente y su generador, así como el generador de la presentación. El PDF y el PowerPoint se regeneraron desde esos archivos fuente; la prueba visual D1–D8 de la aplicación permanece pendiente.

## Verificación

- Informe PDF regenerado y texto extraído: aparecen Recall@5, 0,90, 25 pruebas, aprobación del Golden Set y los fallos C01/V02; no aparecen Recall@4, 17 pruebas ni la aprobación del Golden Set como pendiente.
- Presentación PowerPoint regenerada; el texto extraído confirma 25/25 pruebas, Recall@5, 0,90, aprobación del Golden Set y la evaluación Gemini pendiente.
- El generador de PowerPoint ya no depende de una ruta absoluta a un helper instalado en otra cuenta de Windows.
- `git diff --check` no reportó errores en los archivos fuente de texto. El PDF generado es binario y puede contener espacios finales propios de su estructura.

No se ejecutó Gemini, no se cambió la aplicación y no se creó ningún commit.

## Pendientes fuera de este paso

1. Configurar Gemini localmente sin compartir la clave y ejecutar/revisar las 20 preguntas.
2. Ensayar visualmente la demostración D1–D8, incluyendo la presentación del HTTP 503 ante fallos reales visibles.
3. Actualizar los informes con métricas de generación solo después de esa corrida.
