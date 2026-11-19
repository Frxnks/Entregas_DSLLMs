# Aclaraciones del cliente · Ronda 1

Responde: Nikolas Lagos, representante del cliente. Fuentes: informes de la Entrega 1 (DEC-01 a DEC-12) y de la Entrega 2 (RQF-022, DEC-13 a DEC-16, verificación F4).

| ID | Pregunta | Respuesta del cliente | Fuente |
|---|---|---|---|
| ACL-1 | Q-1 | El puntaje del caso es el promedio simple de los puntajes de sus señales, en escala 0 a 100. Si el caso llega sin señales, MIRA no decide sola: lo deriva a revisión. | E2, verificación F4 (señales 95 y 93 dan 94) |
| ACL-2 | Q-2 | Un puntaje alto significa más confianza. Cada cliente tiene un umbral de aprobación: si el puntaje es mayor o igual al umbral, se aprueba; si es menor, se deriva a revisión. MIRA nunca rechaza un caso por sí sola, así que RECHAZAR no es una decisión automática válida. Además, cada cliente tiene un mínimo por señal: si alguna señal tiene un puntaje menor a ese mínimo, el caso se deriva aunque el promedio alcance el umbral. Ambos valores van en escala 0 a 100 y son propios de cada cliente. | E1 DEC-04 (sin rechazo automático), DEC-11 (umbral configurable); E2 RQF-022 (mínimo por señal) |
| ACL-3 | Q-3 | Una señal de fraude es una señal marcada explícitamente como fraude. Si el caso tiene al menos una, siempre se deriva a revisión, sin importar el puntaje. Nunca se rechaza automáticamente. | E1 DEC-04; E2 (fraude con puntaje 99 queda derivado) |
| ACL-4 | Q-4 | Si el cliente no tiene umbrales configurados, MIRA no decide y responde un error que indica que falta la configuración del cliente. No se usan valores por defecto. | Decisión del cliente sin fuente previa; registrada como supuesto en la bitácora |
| ACL-5 | Q-5 | Sí, el motivo es obligatorio. Valores posibles: FRAUDE, SIN_SENALES, SENAL_BAJO_MINIMO, PUNTAJE_BAJO_UMBRAL (los cuatro derivan) y PUNTAJE_SOBRE_UMBRAL (aprueba). Si se cumplen varios, manda este orden: FRAUDE, luego SIN_SENALES, luego SENAL_BAJO_MINIMO, luego PUNTAJE_BAJO_UMBRAL. | E2, aclaración Q4 (jerarquía: fraude, mínimo de señal, puntaje) |
