# Resultados de recuperación RAG

Ejecución semántica con `paraphrase-multilingual-MiniLM-L12-v2`, backend ONNX cuantizado, ChromaDB y `k = 4`.

| Estrategia | Fragmentos | Recall@4 por pregunta | Recall@4 por evidencia |
|---|---:|---:|---:|
| Secciones completas | 35 | 0,8125 | 0,85 |
| Ventanas de 450 caracteres, solapamiento 90 | 40 | 0,8125 | 0,85 |

Las cuatro preguntas sin respaldo no participan en Recall porque no tienen evidencia esperada. Se usarán para evaluar abstención durante la generación.

Aunque las métricas agregadas empatan, los errores son distintos. Las secciones no recuperaron a `k=4` la evidencia esperada de R05 sobre legibilidad; las ventanas sí. En cambio, las ventanas recuperaron solo una de las dos fuentes de C02, mientras que las secciones recuperaron ambas. Las dos estrategias recuperaron solo una de las dos fuentes en C01 y V02.

Para la aplicación se conserva `sections` como estrategia predeterminada: mantiene reglas completas y obtuvo mejor cobertura del conflicto de C02, sin aumentar `k` ni mezclar condiciones parciales. El resultado detallado y reproducible está en `resultados_recuperacion.json`.

La validación del representante del cliente continúa pendiente. Esta ejecución técnica no debe presentarse como su aprobación.
