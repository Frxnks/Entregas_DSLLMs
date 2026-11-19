# Especificación · Decisión automática de casos analizados

Estado: BORRADOR
Fuentes: 01-necesidad.md (NEC), 03-aclaraciones.md (ACL-n) (aún no existe)

## 1. Historia de usuario
Como cliente de MIRA (aseguradora que gestiona reembolsos de gastos médicos), quiero que MIRA calcule un puntaje de cada caso ya analizado y decida sola si lo aprueba, lo deriva a revisión o lo rechaza, con umbrales propios por cliente y con la señal de fraude por sobre cualquier otra regla, para no revisar a mano los casos que el análisis ya resolvió.

## 2. Criterios de aceptación
Notación: U_aprobar y U_rechazar son los umbrales configurados del cliente. Sus valores, su número y su sentido no están en la necesidad; se definen en Q-2.

| ID | Given | When | Then | Fuente |
|---|---|---|---|---|
| AC-1 | Un caso analizado de un cliente con umbrales configurados, sin señal de fraude | Se solicita la decisión | La respuesta contiene el puntaje calculado y exactamente una decisión entre APROBAR, DERIVAR_A_REVISION y RECHAZAR | NEC |
| AC-2 | Un caso analizado con señales con puntaje, sin señal de fraude | Se solicita la decisión | El puntaje devuelto es el resultado de la regla de cálculo definida en la aclaración ACL-n, igual en dos solicitudes idénticas [NEEDS CLARIFICATION: Q-1] | NEC |
| AC-3 | Un cliente con umbrales configurados y un caso sin señal de fraude cuyo puntaje cae en la zona de aprobación | Se solicita la decisión | La decisión es APROBAR [NEEDS CLARIFICATION: Q-2] | NEC |
| AC-4 | Un cliente con umbrales configurados y un caso sin señal de fraude cuyo puntaje cae en la zona intermedia | Se solicita la decisión | La decisión es DERIVAR_A_REVISION [NEEDS CLARIFICATION: Q-2] | NEC |
| AC-5 | Un cliente con umbrales configurados y un caso sin señal de fraude cuyo puntaje cae en la zona de rechazo | Se solicita la decisión | La decisión es RECHAZAR [NEEDS CLARIFICATION: Q-2] | NEC |
| AC-6 | Un caso cuyo puntaje, sin considerar el fraude, caería en la zona de aprobación, pero que contiene una señal de fraude | Se solicita la decisión | La decisión es la definida para fraude, no APROBAR [NEEDS CLARIFICATION: Q-3] | NEC |
| AC-7 | Un caso con señal de fraude y un puntaje que caería en la zona de rechazo o de revisión | Se solicita la decisión | La decisión es la misma definida para fraude, sin importar el puntaje [NEEDS CLARIFICATION: Q-3] | NEC |
| AC-8 | Dos clientes con umbrales distintos y el mismo caso sin señal de fraude, con un puntaje que cae en zonas distintas según cada cliente | Se solicita la decisión para cada cliente | Cada cliente recibe la decisión que corresponde a sus propios umbrales, y las decisiones difieren [NEEDS CLARIFICATION: Q-2] | NEC |
| AC-9 | Un cliente sin umbrales configurados | Se solicita la decisión de un caso | El sistema responde según lo definido para clientes sin configuración [NEEDS CLARIFICATION: Q-4] | NEC |
| AC-10 | Un caso analizado | Se solicita la decisión | La respuesta incluye el motivo de la decisión, según lo definido en la aclaración [NEEDS CLARIFICATION: Q-5] | NEC |

## 3. Caso de uso: Decidir un caso analizado
- Actor principal: motor de análisis o sistema de MIRA que entrega el caso ya analizado (quién invoca está por confirmar en el diseño, no es regla de negocio).
- Precondiciones: el caso ya fue analizado y trae sus señales con puntaje; el cliente dueño del caso está identificado.
- Garantía de éxito: el caso queda con una de tres decisiones (APROBAR, DERIVAR_A_REVISION, RECHAZAR), calculada con los umbrales de su cliente.

Flujo principal:
1. El sistema recibe el caso analizado con su identificación de cliente y sus señales.
2. El sistema obtiene los umbrales del cliente.
3. El sistema revisa si el caso contiene una señal de fraude.
4. Sin señal de fraude, el sistema calcula el puntaje del caso [Q-1].
5. El sistema compara el puntaje con los umbrales del cliente [Q-2].
6. El sistema entrega la decisión (APROBAR, DERIVAR_A_REVISION o RECHAZAR) junto con el puntaje.

Flujos alternativos:
- 3a. El caso contiene señal de fraude: el sistema decide según la regla de fraude [Q-3] y omite la comparación con umbrales (pasos 4 y 5). Si el puntaje se informa igualmente está pendiente en Q-5.

Excepciones:
- E1. El cliente no tiene umbrales configurados: el comportamiento está pendiente [Q-4].
- E2. El caso llega sin señales o con datos incompletos: no está definido en la necesidad; se resolverá junto con Q-1 (no se asume ningún valor).

## 4. Preguntas de aclaración abiertas
| ID | Pregunta | Por qué importa | Opciones | AC afectados |
|---|---|---|---|---|
| Q-1 | ¿Cómo se calcula el puntaje del caso a partir de las señales con puntaje, en qué escala está, y qué pasa si el caso llega sin señales? | La necesidad dice "calcule un puntaje" pero no la fórmula ni la escala. Sin esto no se puede probar el valor del puntaje ni ninguna comparación con umbrales. | a) Suma de los puntajes de las señales. b) Promedio de los puntajes de las señales. c) Máximo de los puntajes de las señales. d) Otra regla (indicar fórmula y escala). | AC-1, AC-2, E2 |
| Q-2 | ¿Cuántos umbrales tiene cada cliente, qué significa un puntaje alto (más riesgo o más confianza) y a qué decisión pertenece un puntaje exactamente igual a un umbral? | Define las zonas de AC-3 a AC-5 y AC-8, y qué valores concretos se prueban en los límites. | a) Dos umbrales; puntaje alto = más riesgo; menor que U_aprobar aprueba, desde U_aprobar hasta menor que U_rechazar deriva, desde U_rechazar rechaza. b) Dos umbrales; puntaje alto = más confianza (sentido inverso); indicar inclusividad en los bordes. c) Otro esquema (describir). | AC-3, AC-4, AC-5, AC-8 |
| Q-3 | ¿Qué decisión produce una señal de fraude, y qué se considera señal de fraude? | "Manda por sobre todo" no dice si el resultado es rechazar o derivar, ni cómo se identifica la señal de fraude entre las demás señales. | a) Siempre RECHAZAR; la señal de fraude es una señal marcada explícitamente como fraude. b) Siempre DERIVAR_A_REVISION; señal marcada como fraude. c) Decisión según el puntaje de la señal de fraude contra un umbral de fraude propio del cliente (indicar regla). | AC-6, AC-7 |
| Q-4 | ¿Qué debe hacer MIRA si el cliente no tiene umbrales configurados? | La necesidad pide umbrales por cliente, pero no dice si existe un valor por defecto. | a) Rechazar la solicitud con un error indicando que falta configuración. b) Usar umbrales por defecto de MIRA (indicar valores). c) Derivar siempre a revisión. | AC-9, E1 |
| Q-5 | ¿Debe la respuesta indicar el motivo de la decisión (por fraude o por puntaje y umbral aplicado)? | Afecta el contenido de la respuesta y permite auditar por qué se decidió. La necesidad no lo pide ni lo excluye. | a) Sí, motivo obligatorio. b) No, solo puntaje y decisión. | AC-10 |

## 5. Fuera de alcance
- El motor de análisis y la generación de las señales con puntaje (el caso llega ya analizado).
- La carga, edición o administración de los umbrales por parte del cliente, salvo lo que defina Q-4 (la necesidad solo exige que cada cliente pueda tener los suyos).
- La revisión manual de los casos derivados.
- Persistencia histórica, notificaciones, autenticación y autorización.
- Cualquier decisión de tecnología, endpoints o estructura de datos (corresponde al planificador).

## 6. Cambios tras aclaraciones
(Solo en la segunda pasada: qué AC cambiaron y por cuál respuesta ACL-n.)
