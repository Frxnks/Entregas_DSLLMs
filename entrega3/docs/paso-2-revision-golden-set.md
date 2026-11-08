# Paso 2 — Revisión del Golden Set CU-1

**Fecha de revisión técnica:** 2026-11-08  
**Commit sugerido al cerrar la validación:** `test(entrega3): validar golden set de CU-1`

## Alcance y estado

Se contrastaron las 20 preguntas, las respuestas esperadas y las secciones citadas en `evaluacion/golden_set.json` con los seis documentos originales bajo `insumos/CU-1_operador_revision/corpus/`.

**Resultado técnico:** no encontré una respuesta esperada o referencia documental que requiera corrección. La composición también coincide con la pauta: 12 preguntas respondibles, 4 sin respuesta, 2 conflictos vigentes y 2 comparaciones de versiones.

**Estado de aceptación del cliente: validado por Nikolas el 2026-11-08, sin cambios.** La confirmación cubre las 20 preguntas, sus respuestas esperadas y sus evidencias, incluidas las cuatro preguntas sin respuesta que deben probar abstención. No se añadieron comentarios atribuidos al representante que no haya proporcionado.

## Revisión por pregunta

| IDs | Comprobación | Documento y sección esperada | Resultado |
|---|---|---|---|
| R01 | El asistente no aprueba ni rechaza; la decisión la toma el operador. | FAQ-OPE v2, «¿Puedo pedirle al asistente…?» | Coherente |
| R02 | El orden de revisión pone razón, señales/fraude, evidencias y puntaje al final. | MAN-REV v1, §2 «Orden recomendado» | Coherente |
| R03–R04 | Los mínimos son DOC_AUT 70 y BIO_ROSTRO 75. | POL-DEC v2, §3 «Mínimos por señal» | Coherente |
| R05 | DOC_LEG bajo 50 recomienda solicitar reenvío. | CAT-SEN v3, §2 «Señales documentales» | Coherente; el fallo previamente medido es de recuperación, no de esta respuesta esperada |
| R06 | FRA_MEMORIA indica que la misma pieza o una casi idéntica fue presentada antes. | CAT-SEN v3, §6 «Señales de fraude» | Coherente |
| R07 | La ausencia de una señal deriva a revisión y nunca se interpreta como favorable. | POL-DEC v2, §6 «Señales faltantes» | Coherente |
| R08 | La solicitud identifica el caso, documentos/capturas requeridos y motivo comprensible. | PRO-ANT v1, §2 «Contenido de la solicitud» | Coherente |
| R09–R11 | Roles permitidos, excepción para tercera solicitud y bloqueo de casos aprobados automáticamente. | PRO-ANT v1, §4 «Límites» | Coherente |
| R12 | La solicitud registra autor y fecha, cambia estado y notifica al sistema de origen. | PRO-ANT v1, §3 «Registro y efecto» | Coherente |
| N01 | El corpus enumera componentes del puntaje, pero no define pesos porcentuales exactos. | POL-DEC v2, §7 «Componentes del puntaje» | Abstención válida |
| N02 | No se encontró una tasa de error medida del módulo. | Corpus CU-1 | Abstención válida |
| N03 | No se encontró un costo monetario de solicitar antecedentes. | PRO-ANT v1 y corpus CU-1 | Abstención válida |
| N04 | No se identifica un proveedor comercial de BIO_ROSTRO. | CAT-SEN v3 y corpus CU-1 | Abstención válida |
| C01 | MAN-REV afirma aprobación desde 80 sin fraude; POL-DEC v2 da 85 como referencia y añade condiciones. | MAN-REV v1, §1; POL-DEC v2, §2 | Conflicto vigente bien planteado |
| C02 | Para 82 puntos y DOC_AUT bajo 70, el manual y la política conducen a afirmaciones incompatibles. | MAN-REV v1, §1; POL-DEC v2, §3 | Conflicto vigente bien planteado |
| V01 | La política derogada resta 20 por fraude; la vigente deriva por fraude sin descontar puntos. | POL-DEC v1, §4; POL-DEC v2, §4 | Cambio de versión coherente |
| V02 | La política derogada permite cambios inmediatos por diseñador; la vigente requiere dos supervisores. | POL-DEC v1, §3; POL-DEC v2, §5 | Cambio de versión coherente |

## Observación sobre la secuencia de evaluación

El Golden Set se fijó en el commit `4bc95ee` del 6 de noviembre. Sin embargo, `evaluacion/resultados_recuperacion.json` registra una evaluación semántica el 7 de noviembre, mientras que la validación del representante aún aparecía pendiente. Por tanto, cualquier validación del representante realizada ahora es posterior a esa primera ejecución. No debe afirmarse que se validó antes de ella.

La ejecución histórica se conserva como evaluación del conjunto fijado, con la salvedad de que la aprobación llegó después. Si se modifica cualquier pregunta, respuesta o evidencia, hay que reevaluar el Golden Set modificado y dejar trazabilidad de qué cambió y cuándo.

## Dónde revisar o proponer cambios

- Preguntas, evidencias y respuestas esperadas: `evaluacion/golden_set.json`.
- Fuentes para contrastarlas: `insumos/CU-1_operador_revision/corpus/`.
- Estado de validación del representante: objeto `client_validation` al inicio de `golden_set.json`.

La revisión técnica no recomendó cambios de contenido y Nikolas confirmó las 20 entradas tal como están. No se han inventado comentarios ni una aceptación atribuida al representante.
