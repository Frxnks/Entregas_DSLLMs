Agente: analista · Skills cargadas: historia-gwt

# Especificación · Decisión automática de casos analizados

Estado: APROBADA por el representante del cliente (H2). El vacío de la sección 7 queda fuera de alcance y no se prueba.
Fuentes: 01-necesidad.md (NEC), 03-aclaraciones.md (ACL-1 a ACL-5)

## 1. Historia de usuario
Como cliente de MIRA (aseguradora que gestiona reembolsos de gastos médicos), quiero que MIRA calcule un puntaje de cada caso ya analizado y decida sola si lo aprueba o lo deriva a revisión, con umbrales propios por cliente y con la señal de fraude por sobre cualquier otra regla, para no revisar a mano los casos que el análisis ya resolvió.

## 2. Reglas de negocio
| ID | Regla | Fuente |
|---|---|---|
| RN-1 | El puntaje del caso es el promedio simple de los puntajes de sus señales, en escala 0 a 100. | ACL-1 |
| RN-2 | Un puntaje alto significa más confianza. | ACL-2 |
| RN-3 | Cada cliente tiene un umbral de aprobación y un mínimo por señal, ambos en escala 0 a 100 y propios del cliente. | NEC, ACL-2 |
| RN-4 | Puntaje mayor o igual al umbral aprueba; puntaje menor al umbral deriva a revisión. | ACL-2 |
| RN-5 | Si alguna señal tiene puntaje menor al mínimo por señal del cliente, el caso se deriva aunque el promedio alcance el umbral. Un puntaje igual al mínimo no deriva. | ACL-2 |
| RN-6 | Una señal de fraude es una señal marcada explícitamente como fraude. Con al menos una, el caso se deriva siempre, sin importar el puntaje. | NEC, ACL-3 |
| RN-7 | Un caso sin señales no se decide: se deriva a revisión. | ACL-1 |
| RN-8 | MIRA nunca rechaza un caso por sí sola. RECHAZAR no es una decisión automática válida. | ACL-2, ACL-3 |
| RN-9 | Cliente sin umbrales configurados: no hay decisión; se responde un error que indica que falta la configuración del cliente. No hay valores por defecto. | ACL-4 |
| RN-10 | La respuesta incluye siempre el motivo. Valores: FRAUDE, SIN_SENALES, SENAL_BAJO_MINIMO, PUNTAJE_BAJO_UMBRAL (derivan) y PUNTAJE_SOBRE_UMBRAL (aprueba). | ACL-5 |
| RN-11 | Precedencia cuando se cumplen varios motivos: FRAUDE, SIN_SENALES, SENAL_BAJO_MINIMO, PUNTAJE_BAJO_UMBRAL. | ACL-5 |

## 3. Criterios de aceptación
Los valores de umbral y mínimo de los ejemplos son datos de prueba de cada AC; los valores reales los define cada cliente.

| ID | Given | When | Then | Fuente |
|---|---|---|---|---|
| AC-1 | Un cliente con umbral 90 y mínimo por señal 50; un caso sin fraude con dos señales de puntaje 95 y 93 | Se solicita la decisión | El puntaje es 94 (promedio simple) | ACL-1 |
| AC-2 | Un cliente con umbral 90 y mínimo por señal 50; un caso sin fraude con señales 95 y 93 (puntaje 94) | Se solicita la decisión | La decisión es APROBAR con motivo PUNTAJE_SOBRE_UMBRAL | ACL-2, ACL-5 |
| AC-3 | Un cliente con umbral 85 y mínimo 50; un caso sin fraude con señales 80 y 90 (puntaje 85, igual al umbral) | Se solicita la decisión | La decisión es APROBAR con motivo PUNTAJE_SOBRE_UMBRAL | ACL-2 |
| AC-4 | Un cliente con umbral 85 y mínimo 50; un caso sin fraude con señales 80 y 88 (puntaje 84) | Se solicita la decisión | La decisión es DERIVAR_A_REVISION con motivo PUNTAJE_BAJO_UMBRAL | ACL-2, ACL-5 |
| AC-5 | Un cliente con umbral 70 y mínimo 50; un caso sin fraude con señales 100, 100 y 40 (puntaje 80, sobre el umbral) | Se solicita la decisión | La decisión es DERIVAR_A_REVISION con motivo SENAL_BAJO_MINIMO | ACL-2, ACL-5 |
| AC-6 | Un cliente con umbral 70 y mínimo 50; un caso sin fraude con señales 100 y 50 (puntaje 75; una señal igual al mínimo) | Se solicita la decisión | La decisión es APROBAR con motivo PUNTAJE_SOBRE_UMBRAL | ACL-2 |
| AC-7 | Un cliente con umbral 85 y mínimo 50; un caso sin fraude con señales 40 y 60 (puntaje 50, bajo el umbral, y una señal bajo el mínimo) | Se solicita la decisión | La decisión es DERIVAR_A_REVISION con motivo SENAL_BAJO_MINIMO, no PUNTAJE_BAJO_UMBRAL | ACL-5 |
| AC-8 | Un cliente con umbral 85 y mínimo 50; un caso con una señal marcada como fraude de puntaje 99 y otra señal de 99 (puntaje 99) | Se solicita la decisión | La decisión es DERIVAR_A_REVISION con motivo FRAUDE | NEC, ACL-3 |
| AC-9 | Un cliente con umbral 85 y mínimo 50; un caso con una señal marcada como fraude de puntaje 10 y otra de 20 (puntaje 15, bajo umbral y bajo mínimo) | Se solicita la decisión | La decisión es DERIVAR_A_REVISION con motivo FRAUDE, no SENAL_BAJO_MINIMO ni PUNTAJE_BAJO_UMBRAL | ACL-3, ACL-5 |
| AC-10 | Un cliente con umbral 85 y mínimo 50; un caso sin señales | Se solicita la decisión | La decisión es DERIVAR_A_REVISION con motivo SIN_SENALES | ACL-1, ACL-5 |
| AC-11 | Un cliente con umbral 85 y mínimo 0; un caso sin fraude con señales 0 y 0 (puntaje 0) | Se solicita la decisión | La decisión es DERIVAR_A_REVISION; en ningún caso la decisión es RECHAZAR | ACL-2 |
| AC-12 | Cliente A con umbral 70 y cliente B con umbral 90, ambos con mínimo 50; el mismo caso sin fraude con señales 80 y 80 (puntaje 80) | Se solicita la decisión para cada cliente | El cliente A recibe APROBAR y el cliente B recibe DERIVAR_A_REVISION | NEC, ACL-2 |
| AC-13 | Cliente A con umbral 80 y mínimo 50; cliente B con umbral 80 y mínimo 70; el mismo caso sin fraude con señales 100, 100 y 60 | Se solicita la decisión para cada cliente | El cliente A recibe APROBAR y el cliente B recibe DERIVAR_A_REVISION con motivo SENAL_BAJO_MINIMO | NEC, ACL-2 |
| AC-14 | Un cliente sin umbrales configurados; un caso con señales 95 y 93 | Se solicita la decisión | No se entrega decisión; se responde un error que indica que falta la configuración del cliente, sin aplicar valores por defecto | ACL-4 |

## 4. Caso de uso: Decidir un caso analizado
- Actor principal: motor de análisis o sistema de MIRA que entrega el caso ya analizado.
- Precondiciones: el caso ya fue analizado y trae sus señales con puntaje (cada una marcada o no como fraude); el cliente dueño del caso está identificado.
- Garantía de éxito: el caso queda con una decisión APROBAR o DERIVAR_A_REVISION y un motivo, calculados con los umbrales de su cliente.

Flujo principal:
1. El sistema recibe el caso analizado con su identificación de cliente y sus señales.
2. El sistema obtiene los umbrales del cliente (umbral de aprobación y mínimo por señal).
3. El sistema revisa si alguna señal está marcada como fraude.
4. El sistema revisa que el caso tenga señales.
5. El sistema calcula el puntaje como promedio simple de los puntajes de las señales.
6. El sistema revisa si alguna señal tiene puntaje menor al mínimo por señal del cliente.
7. El sistema compara el puntaje con el umbral de aprobación: mayor o igual aprueba.
8. El sistema entrega la decisión APROBAR con motivo PUNTAJE_SOBRE_UMBRAL.

Flujos alternativos:
- 3a. Hay al menos una señal de fraude: el sistema decide DERIVAR_A_REVISION con motivo FRAUDE y no evalúa los pasos 4 a 7.
- 4a. El caso no tiene señales: el sistema decide DERIVAR_A_REVISION con motivo SIN_SENALES.
- 6a. Alguna señal tiene puntaje menor al mínimo: el sistema decide DERIVAR_A_REVISION con motivo SENAL_BAJO_MINIMO.
- 7a. El puntaje es menor al umbral: el sistema decide DERIVAR_A_REVISION con motivo PUNTAJE_BAJO_UMBRAL.

Excepciones:
- E1. El cliente no tiene umbrales configurados (paso 2): el sistema no decide y responde un error que indica que falta la configuración del cliente. No usa valores por defecto.

## 5. Preguntas de aclaración abiertas
Ninguna. Q-1 a Q-5 fueron respondidas en ACL-1 a ACL-5.

## 6. Fuera de alcance
- El motor de análisis y la generación de las señales con puntaje (el caso llega ya analizado).
- La carga, edición o administración de los umbrales por parte del cliente.
- La revisión manual de los casos derivados.
- Rechazo de casos: MIRA no rechaza automáticamente (ACL-2).
- Persistencia histórica, notificaciones, autenticación y autorización.
- Cualquier decisión de tecnología, endpoints o estructura de datos (corresponde al planificador).

## 7. Cambios tras aclaraciones
Primera pasada: 10 AC con marcas [NEEDS CLARIFICATION]. Segunda pasada: 14 AC sin marcas; los AC-1 a AC-10 anteriores se reescribieron por completo y los números no se corresponden uno a uno.

- ACL-1 (Q-1): promedio simple 0 a 100; sin señales deriva. Reemplaza al antiguo AC-2 y a la excepción E2. Genera AC-1 y AC-10.
- ACL-2 (Q-2): puntaje alto = más confianza; un solo umbral de aprobación (>= aprueba, < deriva); mínimo por señal; sin rechazo automático. Reemplaza al antiguo esquema de dos umbrales (AC-3 a AC-5, AC-8). Genera AC-2 a AC-6, AC-11, AC-12 y AC-13. El antiguo AC-5 (RECHAZAR) se elimina.
- ACL-3 (Q-3): fraude = señal marcada; siempre deriva. Reemplaza al antiguo AC-6 y AC-7. Genera AC-8 y AC-9.
- ACL-4 (Q-4): sin configuración, error y sin valores por defecto. Reemplaza al antiguo AC-9. Genera AC-14.
- ACL-5 (Q-5): motivo obligatorio con cinco valores y precedencia. Reemplaza al antiguo AC-10; el motivo se verifica en cada AC y la precedencia en AC-7 y AC-9. La historia pasó de "aprueba, deriva o rechaza" a "aprueba o deriva".
- Vacío no cubierto por las aclaraciones: no se define si la respuesta informa el puntaje cuando el caso se deriva por FRAUDE o SIN_SENALES, ni si una señal de fraude entra en el promedio. Ningún AC lo exige; las pruebas no deben verificarlo.
