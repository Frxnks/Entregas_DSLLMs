# Paso 3 — Mejora de recuperación RAG

**Fecha:** 2026-11-08  
**Commit sugerido:** `fix(entrega3): usar top-k configurable para mejorar recuperación`

## Problema investigado

La corrida semántica original usaba `k = 4`. Con la estrategia `sections`, la evidencia esperada de R05 —CAT-SEN v3 §2, sobre reenviar un documento con DOC_LEG bajo 50— aparecía en quinto lugar y por eso no se recuperaba. `windows` sí la encontraba dentro de sus primeros cuatro resultados, pero a ese mismo k recuperaba solo una de las dos fuentes esperadas por C02.

También se detectó una desconexión de configuración: aunque `.env.example` declaraba `RAG_TOP_K`, el servidor MCP ofrecía `top_k = 4` y permitía al modelo elegir el valor. Cambiar solo el valor de configuración no garantizaba que la aplicación usara cinco resultados.

## Experimento

Se reconstruyeron índices Chroma semánticos aislados para las estrategias `sections` (35 fragmentos) y `windows` (40 fragmentos), usando el modelo multilingüe ONNX cuantizado ya especificado por el proyecto. Se evaluaron las 16 preguntas con evidencia esperada a `k = 4, 5, 6, 8`, sin alterar la corrida histórica ni ejecutar el LLM. Los resultados detallados de la nueva corrida a `k = 5` están en `evaluacion/resultados_recuperacion.json`.

| Estrategia | k | Recall por pregunta | Recall por evidencia |
|---|---:|---:|---:|
| Secciones | 4 | 0,8125 (13/16) | 0,85 (17/20) |
| Ventanas | 4 | 0,8125 (13/16) | 0,85 (17/20) |
| Secciones | 5 | 0,875 (14/16) | 0,90 (18/20) |
| Ventanas | 5 | 0,875 (14/16) | 0,90 (18/20) |
| Secciones | 6 u 8 | 0,875 (14/16) | 0,90 (18/20) |
| Ventanas | 6 u 8 | 0,875 (14/16) | 0,90 (18/20) |

Con `sections` y `k = 5`, R05 recupera la evidencia como quinto resultado y C02 conserva ambas fuentes (MAN-REV v1 §1 y POL-DEC v2 §3). Por tanto, aumentar el corte de 4 a 5 resuelve R05 sin perder la evidencia de C02. `k = 6` y `k = 8` no mejoraron las métricas.

## Cambio aplicado

- El valor predeterminado de `RAG_TOP_K` pasó a 5 en configuración, plantilla de entorno y herramientas de consulta.
- La herramienta MCP ya no expone `top_k` al modelo: el servidor aplica el valor configurado. Esto evita que una llamada del modelo vuelva a truncar el resultado en cuatro fragmentos.
- Se mantiene `sections` como estrategia por defecto: aunque ambas estrategias empatan a k=5, las secciones conservan juntas las condiciones completas de cada regla.
- Se actualizaron `evaluacion/resultados_recuperacion.md` y `evaluacion/resultados_recuperacion.json`, y el README ahora indica ejecutar la evaluación con `--top-k 5`.

## Limitaciones que siguen visibles

A `k = 5`, ambas estrategias todavía recuperan solo una de las dos evidencias esperadas para C01 y V02. Son **dos fallos de recuperación** identificados, no fallos de generación ni abstenciones. No se ocultaron ni se sustituyeron por respuestas del modo demo. Su tratamiento y la evaluación de generación permanecen pendientes.

La primera evaluación guardada es del 7 de noviembre y antecede la validación del representante del 8 de noviembre. La corrida actual usa las mismas 20 entradas, aprobadas sin cambios, y registra explícitamente esa secuencia.

## Verificación

- `python -m pytest entrega3/service/tests`: **19 pruebas aprobadas**.
- La prueba nueva verifica que MCP aplica `RAG_TOP_K` y que el modelo ya no recibe `top_k` como argumento elegible.
- La validación aritmética del JSON confirma 16 preguntas evaluables, Recall@5 de 0,875/0,90 para ambas estrategias y los fallos residuales C01 y V02.
- No se evaluó generación, precisión de citas ni fidelidad en este paso.
- No se creó ningún commit.
