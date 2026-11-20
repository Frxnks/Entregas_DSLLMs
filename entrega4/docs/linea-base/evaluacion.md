# Evaluación de la línea base contra la especificación aprobada

Script: `docs/linea-base/evaluar_ac.py` (ejecutado con el python del .venv de entrega4). Código evaluado: `docs/linea-base/codigo/`.

## 1. Resultado por AC

| AC | Esperado | Obtenido | Cumple |
|---|---|---|---|
| AC-1 | puntaje 94 | puntaje 94.0 | SÍ |
| AC-2 | APROBAR [PUNTAJE_SOBRE_UMBRAL] | APROBAR [sin motivo] | NO (no entrega motivo) |
| AC-3 | APROBAR [PUNTAJE_SOBRE_UMBRAL] | APROBAR [sin motivo] | NO (no entrega motivo) |
| AC-4 | DERIVAR_A_REVISION [PUNTAJE_BAJO_UMBRAL] | DERIVAR_A_REVISION [PUNTAJE_BAJO_UMBRAL] | SÍ |
| AC-5 | DERIVAR_A_REVISION [SENAL_BAJO_MINIMO] | DERIVAR_A_REVISION [SENAL_BAJO_MINIMO] | SÍ |
| AC-6 | APROBAR [PUNTAJE_SOBRE_UMBRAL] | APROBAR [sin motivo] | NO (no entrega motivo) |
| AC-7 | DERIVAR_A_REVISION [SENAL_BAJO_MINIMO] | DERIVAR_A_REVISION [PUNTAJE_BAJO_UMBRAL, SENAL_BAJO_MINIMO] | NO (varios motivos, no indica cuál prima) |
| AC-8 | DERIVAR_A_REVISION [FRAUDE] | DERIVAR_A_REVISION [FRAUDE] | SÍ |
| AC-9 | DERIVAR_A_REVISION [FRAUDE] | DERIVAR_A_REVISION [FRAUDE, PUNTAJE_BAJO_UMBRAL, SENAL_BAJO_MINIMO] | NO (varios motivos, no indica cuál prima) |
| AC-10 | DERIVAR_A_REVISION [SIN_SENALES] | DERIVAR_A_REVISION [SIN_SENALES] | SÍ |
| AC-11 | DERIVAR_A_REVISION, nunca RECHAZAR | DERIVAR_A_REVISION [PUNTAJE_BAJO_UMBRAL] | SÍ |
| AC-12 | A=APROBAR, B=DERIVAR_A_REVISION | A=APROBAR, B=DERIVAR_A_REVISION | SÍ |
| AC-13 | A=APROBAR, B=DERIVAR_A_REVISION [SENAL_BAJO_MINIMO] | igual | SÍ |
| AC-14 | error de falta de configuración, sin decisión | HTTP 404 `client_config_missing` | SÍ |

**Total: 9/14.**

Notas sobre los 5 NO:
- AC-2, AC-3, AC-6: la decisión es correcta, pero al aprobar la línea base devuelve `reasons=[]` (`decision.py:82`); no existe nada equivalente a PUNTAJE_SOBRE_UMBRAL. Si el equipo aceptara "lista vacía = PUNTAJE_SOBRE_UMBRAL", el total subiría a 12/14.
- AC-7, AC-9: la línea base acumula todos los motivos que se cumplen (`decision.py:71-78`) en el orden en que los evalúa (fraude, umbral, mínimo), que no es la precedencia de RN-11, y no marca cuál prima. En AC-9 el primer elemento sí es FRAUDE, pero eso es orden de evaluación, no una precedencia declarada; por el criterio acordado cuenta como NO.

## 2. Comportamientos fuera de la especificación

- **Endpoints**: `PUT /clients/{id}/config` y `GET /clients/{id}/config` (`api.py:39-49`). La carga y administración de umbrales está fuera de alcance (02-especificacion.md, sección 6). El endpoint de decisión es `POST /clients/{id}/decision` (`api.py:51`); la especificación no define endpoints.
- **Almacenamiento de configuración en memoria** (`api.py:37`): persistencia/administración de umbrales, fuera de alcance.
- **Decisión llamada `REVISION`** (`decision.py:20-22`), no `DERIVAR_A_REVISION`.
- **Motivos como lista** `reasons` con nombres en minúscula (`decision.py:68-78`); la especificación exige un motivo (RN-10) con otros nombres y sin motivo en la aprobación.
- **Precedencia distinta**: fraude + sin-señales no se evalúan como RN-11; con lista vacía devuelve solo `sin_senales` (`decision.py:67-68`), consistente con RN-11 en ese caso, pero el resto se acumula en vez de elegir uno (`decision.py:71-78`).
- **Campo `score` nullable**: devuelve `None` sin señales (`decision.py:68`, `api.py:31`). La especificación deja este punto sin definir (sección 7, vacío) y no lo exige.
- **Fraude entra en el promedio** (`decision.py:70`): la especificación lo deja sin definir (sección 7).
- **Validaciones no pedidas**: rango 0 a 100 en puntajes y configuración, rechazo de NaN/bool/strings, `extra="forbid"`, nombre de señal obligatorio y no vacío (`decision.py:31-36`, `api.py:8-27`), respuesta 422.
- **Código de error 404** con `{"error": "client_config_missing", ...}` (`api.py:67-74`): la especificación solo pide un error que indique falta de configuración.
- **Error de configuración antes que fraude o sin señales** (`api.py:54-58`): interpretación de la línea base, coherente con RN-9 pero no explicitada; la línea base lo declaró en su resumen.
- Mínimo por señal y umbral pueden valer 0 a 100 sin restricción de relación entre ellos (no pedido).

## 3. Las 3 preguntas frente a la respuesta del cliente

Fuente: capturas de pantalla de `docs/linea-base/` (opción marcada "Recommended" por la línea base) y respuestas del cliente en `transcripcion-linea-base.txt` (líneas 21-40).

| # | Opción que la línea base marcó como "Recommended" | Respuesta del cliente | ¿Contradice al cliente? |
|---|---|---|---|
| 1 | Puntaje 0-100 de confianza; score < umbral_rechazo → RECHAZAR; umbrales por defecto 80 y 40 | Nunca rechaza; sin valores por defecto | SÍ |
| 2 | Puntaje ya calculado + señales; cualquier señal de fraude activa → RECHAZAR | Puntaje = promedio de señales; fraude deriva | SÍ |
| 3 | Fraude → RECHAZAR; umbrales en memoria con valores por defecto si el cliente no tiene | Fraude deriva; sin configuración → error, sin valores por defecto | SÍ |

Las tres recomendaciones contradecían las fuentes del cliente (DEC-04). El resultado final fue correcto en esos puntos solo porque el representante del cliente no aceptó las recomendaciones.

La línea base no preguntó por el motivo de la decisión ni por su precedencia (equivalente a Q-5/ACL-5 del flujo multiagente). De esa omisión vienen sus 5 AC incumplidos (AC-2, 3, 6, 7 y 9).

## 4. Pruebas

- 22 casos de prueba (coincide con lo informado en la transcripción): 16 funciones, de las cuales `test_validacion_de_puntajes` (5 casos) y `test_api_config_invalida` (3 casos) están parametrizadas.
- **Trazabilidad a los AC: ninguna.** No hay identificadores AC-n en nombres ni comentarios; los nombres describen reglas en lenguaje libre (p. ej. `test_minimo_por_senal_deriva_aunque_promedio_alcance`) y solo permiten una asociación interpretativa con algunos AC (AC-3, 5, 6, 8, 10, 11, 12, 14). Ninguna prueba verifica motivos con los valores de la especificación y, además, ninguna cubre AC-7 ni AC-9 (precedencia).

## 5. Nota

Las equivalencias de nombres (REVISION ≡ DERIVAR_A_REVISION y los motivos en minúscula ≡ motivos de RN-10) las definió el equipo. La línea base no conocía la especificación aprobada, solo la necesidad y las respuestas del cliente.
