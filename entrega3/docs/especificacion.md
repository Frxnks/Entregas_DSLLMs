# Especificación CU-1

## Propósito y usuario

El usuario es un operador o supervisor de una organización cliente que revisa casos que MIRA no resolvió automáticamente. El asistente explica el caso, recupera reglas y prepara solicitudes de antecedentes. No aprueba ni rechaza.

## Requisitos trazables

| ID | Requisito | Fuente | Verificación |
|---|---|---|---|
| CU1-RF-01 | Responder preguntas documentales con código, sección, versión y vigencia. | PR-2; capítulo 4 | Golden set y citas de la interfaz. |
| CU1-RF-02 | Abstenerse cuando el corpus no contiene una respuesta. | PR-3 | N01–N04. |
| CU1-RF-03 | Exponer fuentes vigentes contradictorias sin elegir. | PR-4 | C01–C02. |
| CU1-RF-04 | Consultar casos, señales, evidencias, solicitudes y cambios solo por MCP. | PR-5; capítulo 5 | Trazas y prueba de lectura sin efectos. |
| CU1-RF-05 | Preparar una solicitud antes de cualquier escritura. | PR-1 y PR-6 | Propuesta visible sin inserción. |
| CU1-RF-06 | Registrar una solicitud solo tras confirmación válida. | PR-6; PRO-ANT §3 | Prueba de confirmación e idempotencia. |
| CU1-RF-07 | Limitar datos a la organización del usuario. | PR-7 | Prueba de acceso cruzado. |
| CU1-RF-08 | Permitir solicitudes solo a operador o supervisor. | PRO-ANT §4 | Rechazo de U-03. |
| CU1-RF-09 | Bloquear solicitudes sobre aprobados automáticamente. | PRO-ANT §4 | Rechazo en C-010 y C-022. |
| CU1-RF-10 | Exigir supervisor para la tercera solicitud. | PRO-ANT §4 | C-016 con U-01 y U-02. |
| CU1-RNF-01 | Mantener intactos los registros entregados. | Regla 3.2 del enunciado | Huellas y triggers de integridad. |
| CU1-RNF-02 | Sanitizar datos antes de enviarlos al proveedor externo. | DEC-06 / RQNF-003; C5 | Pruebas de RUT, correo, teléfono y nombre. |
| CU1-RNF-03 | Informar fallas del proveedor sin inventar respuestas. | Capítulo 6.1 | Respuesta 503 y estado de error en UI. |

## Flujo principal

1. La API crea una sesión para un usuario ficticio conocido.
2. El operador formula una pregunta.
3. La API busca reglas documentales mediante MCP antes de cada respuesta de Gemini, y añade la sesión sin aceptar una identidad propuesta por el modelo.
4. Gemini recibe la pregunta y la evidencia RAG recuperada; para datos operacionales adicionales puede elegir herramientas MCP de lectura.
5. FastMCP autoriza cada llamada y consulta RAG o SQLite mediante operaciones parametrizadas; los resultados se sanitizan antes de volver al modelo.
6. La respuesta muestra citas y trazas.
7. Si se necesita una solicitud, el servidor devuelve una propuesta temporal.
8. La persona confirma; FastMCP revalida todo dentro de una transacción y registra la solicitud y el evento.

## Flujos alternativos

- Sin fuente: abstención explícita.
- Conflicto vigente: ambas fuentes y ninguna resolución automática.
- Versión derogada: se explica el cambio y se identifica la vigente.
- Acceso indebido, rol no autorizado, aprobado automático o tercera solicitud por operador: rechazo sin escritura.
- Proveedor o MCP caído: error visible, sin respuesta fabricada.

## Contradicciones conocidas

POL-DEC v2 §2 establece 85 como umbral de referencia sujeto a mínimos y configuración; MAN-REV v1 §1 afirma aprobación desde 80 sin fraude. Ambas fuentes están vigentes y se presentan como conflicto. Las diferencias entre POL-DEC v1 derogada y v2 vigente se tratan como evolución de versión, no como conflicto vigente.
