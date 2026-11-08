# Resultados de recuperación RAG

Evaluación semántica del Golden Set aprobado por el representante, con `paraphrase-multilingual-MiniLM-L12-v2`, backend ONNX cuantizado y ChromaDB. La corrida inicial guardada el 7 de noviembre usó `k = 4`; después de la validación del 8 de noviembre, se repitió la comparación con `k = 5`. El archivo `resultados_recuperacion.json` contiene el detalle de la corrida actual.

| Estrategia | Fragmentos | Recall@5 por pregunta | Recall@5 por evidencia |
|---|---:|---:|---:|
| Secciones completas | 35 | 0,875 (14/16) | 0,90 (18/20) |
| Ventanas de 450 caracteres, solapamiento 90 | 40 | 0,875 (14/16) | 0,90 (18/20) |

Las 16 preguntas con evidencia esperada participan en Recall; las cuatro preguntas sin respaldo no tienen fragmentos esperados y se evaluarán en generación para medir abstención.

## Comparación y decisión

Subir de `k = 4` a `k = 5` resuelve el fallo concreto de R05 con secciones completas: su evidencia de CAT-SEN v3 §2 aparece como quinto resultado. A la vez, se conservan las dos evidencias esperadas de C02 (MAN-REV v1 §1 y POL-DEC v2 §3). Por ello se fija `RAG_TOP_K=5`, manteniendo `sections` como estrategia predeterminada para preservar reglas completas.

En esta corrida, aumentar de `k = 5` a `k = 6` o `k = 8` no elevó el Recall. Persisten dos casos incompletos en ambas estrategias: C01 y V02 recuperan una de sus dos evidencias esperadas. Se mantienen visibles como fallos de recuperación; no se atribuyen al modelo generador ni se compensan con las métricas de los casos exitosos.

La estrategia `windows` también recupera R05 y ambas evidencias de C02 a `k = 5`, pero su igualdad en métricas agregadas no justifica cambiar la estrategia por defecto: las secciones mantienen juntas las condiciones de cada regla. La comparación documentada no afirma que las citas o respuestas generadas sean correctas; precisión de citas, fidelidad, abstención y manejo de conflictos en generación siguen pendientes de evaluación.

## Secuencia de validación

El Golden Set se fijó el 6 de noviembre. La primera evaluación semántica guardada es del 7 de noviembre; Nikolas validó el conjunto sin cambios el 8 de noviembre. Por tanto, la aprobación ocurrió después de aquella primera corrida. La evaluación actual usa el Golden Set aprobado y registra esta secuencia en `resultados_recuperacion.json`.
