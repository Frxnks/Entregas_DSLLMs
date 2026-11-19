Agente: planificador · Skills cargadas: ninguna

# Plan · Decisión automática de casos analizados

Base: 02-especificacion.md (aprobada, sin [NEEDS CLARIFICATION] abiertos). Stack: Python 3.12, FastAPI, pydantic, pytest. Sin dependencias nuevas.

## 1. Diseño

Un núcleo puro (función sin I/O) más una capa HTTP delgada. La config de umbrales se inyecta, así las pruebas definen clientes A y B sin tocar disco ni base de datos (carga/edición de umbrales está fuera de alcance).

Módulos en src/mira_decision/:

| Módulo | Contenido |
|---|---|
| `__init__.py` | Paquete. |
| `models.py` | Modelos pydantic y enums: `Senal`, `CasoAnalizado`, `UmbralesCliente`, `Decision` (APROBAR, DERIVAR_A_REVISION), `Motivo` (FRAUDE, SIN_SENALES, SENAL_BAJO_MINIMO, PUNTAJE_BAJO_UMBRAL, PUNTAJE_SOBRE_UMBRAL), `ResultadoDecision`. |
| `config.py` | `ClienteSinConfiguracion` (excepción) y `RepositorioUmbrales` (diccionario en memoria `cliente_id -> UmbralesCliente`; `obtener()` lanza la excepción si no existe). Sin valores por defecto. |
| `decision.py` | `decidir(caso, umbrales) -> ResultadoDecision`, función pura. Orden de evaluación según la precedencia RN-11: fraude, sin señales, señal bajo mínimo, puntaje vs umbral. Nunca devuelve RECHAZAR (el enum `Decision` no lo contiene). |
| `api.py` | `create_app(repositorio) -> FastAPI` con el endpoint de decisión; traduce `ClienteSinConfiguracion` a error HTTP. |

Modelos de datos:
- `Senal`: `puntaje: float` (0 a 100, validado), `es_fraude: bool = False`.
- `CasoAnalizado`: `cliente_id: str` (no vacío), `senales: list[Senal]` (puede ser vacía).
- `UmbralesCliente`: `umbral_aprobacion: float` y `minimo_por_senal: float`, ambos 0 a 100.
- `ResultadoDecision`: `decision`, `motivo`, `puntaje: float | None`.

Lógica de `decidir` (RN-1 a RN-11):
1. Si alguna señal tiene `es_fraude`: DERIVAR_A_REVISION, FRAUDE, puntaje None.
2. Si no hay señales: DERIVAR_A_REVISION, SIN_SENALES, puntaje None.
3. puntaje = promedio simple de todos los puntajes (sin redondeo).
4. Si alguna señal tiene puntaje < `minimo_por_senal` (estricto): DERIVAR_A_REVISION, SENAL_BAJO_MINIMO.
5. Si puntaje >= `umbral_aprobacion`: APROBAR, PUNTAJE_SOBRE_UMBRAL. Si no: DERIVAR_A_REVISION, PUNTAJE_BAJO_UMBRAL.

## 2. Contrato de la API

`POST /decisiones`

Cuerpo (JSON):
```json
{"cliente_id": "cliente-a", "senales": [{"puntaje": 95, "es_fraude": false}, {"puntaje": 93}]}
```

Respuestas:
| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Decisión calculada (APROBAR o DERIVAR_A_REVISION, incluidos los derivados por FRAUDE y SIN_SENALES) | `{"decision": "APROBAR", "motivo": "PUNTAJE_SOBRE_UMBRAL", "puntaje": 94.0}` |
| 404 | El cliente no tiene umbrales configurados (RN-9) | `{"error": "CLIENTE_SIN_CONFIGURACION", "detalle": "Falta la configuración de umbrales del cliente <cliente_id>"}` |
| 422 | Cuerpo inválido (puntaje fuera de 0 a 100, falta cliente_id, tipos erróneos); validación estándar de FastAPI | `{"detail": [...]}` |

`puntaje` es `null` cuando el motivo es FRAUDE o SIN_SENALES (ver supuesto S-1). No hay endpoint de configuración (fuera de alcance).

## 3. Tareas

Ordenadas por dependencia.

| Tarea | Descripción | AC | Prueba que la verifica |
|---|---|---|---|
| T-1 | Crear `models.py` con modelos, enums y validación 0 a 100. `Decision` sin RECHAZAR. | AC-11 | `test_ac11_nunca_rechaza` (con los datos del AC: umbral 85, mínimo 0, señales 0 y 0 → DERIVAR_A_REVISION; no basta con inspeccionar el enum) |
| T-2 | Crear `config.py`: `RepositorioUmbrales` y `ClienteSinConfiguracion`, sin valores por defecto. | AC-14 | `test_ac14_cliente_sin_configuracion_lanza_error` |
| T-3 | Crear `decision.py` parte 1: promedio simple y comparación con el umbral (>= aprueba, < deriva). | AC-1, AC-2, AC-3, AC-4 | `test_ac1_puntaje_es_promedio_simple`, `test_ac2_aprueba_sobre_umbral`, `test_ac3_aprueba_con_puntaje_igual_al_umbral`, `test_ac4_deriva_bajo_umbral` |
| T-4 | `decision.py` parte 2: regla de señal bajo el mínimo (estricto) y su precedencia sobre el umbral. | AC-5, AC-6, AC-7 | `test_ac5_deriva_por_senal_bajo_minimo_aunque_promedio_alcance`, `test_ac6_senal_igual_al_minimo_no_deriva`, `test_ac7_senal_bajo_minimo_precede_a_puntaje_bajo_umbral` |
| T-5 | `decision.py` parte 3: fraude (máxima precedencia) y caso sin señales. | AC-8, AC-9, AC-10 | `test_ac8_fraude_deriva_con_puntaje_alto`, `test_ac9_fraude_precede_a_otros_motivos`, `test_ac10_sin_senales_deriva` |
| T-6 | Verificar con datos de dos clientes que los umbrales son propios y que ningún resultado es RECHAZAR. | AC-11, AC-12, AC-13 | `test_ac11_nunca_rechaza`, `test_ac12_mismo_caso_distinto_umbral_por_cliente`, `test_ac13_mismo_caso_distinto_minimo_por_cliente` |
| T-7 | Crear `api.py` con `create_app` y `POST /decisiones`; mapear la excepción a 404 con `CLIENTE_SIN_CONFIGURACION`. | AC-14 (y la entrega HTTP de AC-1 a AC-13) | `test_ac14_api_cliente_sin_configuracion_responde_error`, `test_ac2_api_aprueba_y_devuelve_motivo` |

Total: 7 tareas. Las pruebas de T-3 a T-6 usan `decidir` directamente (tests/test_decision.py); las de T-2 y T-7 usan el repositorio y `TestClient` de FastAPI (tests/test_config.py, tests/test_api.py).

## 4. Matriz AC → tarea → prueba

| AC | Tarea | Prueba |
|---|---|---|
| AC-1 | T-3 | `test_ac1_puntaje_es_promedio_simple` |
| AC-2 | T-3, T-7 | `test_ac2_aprueba_sobre_umbral`, `test_ac2_api_aprueba_y_devuelve_motivo` |
| AC-3 | T-3 | `test_ac3_aprueba_con_puntaje_igual_al_umbral` |
| AC-4 | T-3 | `test_ac4_deriva_bajo_umbral` |
| AC-5 | T-4 | `test_ac5_deriva_por_senal_bajo_minimo_aunque_promedio_alcance` |
| AC-6 | T-4 | `test_ac6_senal_igual_al_minimo_no_deriva` |
| AC-7 | T-4 | `test_ac7_senal_bajo_minimo_precede_a_puntaje_bajo_umbral` |
| AC-8 | T-5 | `test_ac8_fraude_deriva_con_puntaje_alto` |
| AC-9 | T-5 | `test_ac9_fraude_precede_a_otros_motivos` |
| AC-10 | T-5 | `test_ac10_sin_senales_deriva` |
| AC-11 | T-1, T-6 | `test_ac11_nunca_rechaza` |
| AC-12 | T-6 | `test_ac12_mismo_caso_distinto_umbral_por_cliente` |
| AC-13 | T-6 | `test_ac13_mismo_caso_distinto_minimo_por_cliente` |
| AC-14 | T-2, T-7 | `test_ac14_cliente_sin_configuracion_lanza_error`, `test_ac14_api_cliente_sin_configuracion_responde_error` |

Los 14 AC aparecen en la matriz con al menos una prueba.

## 5. Supuestos y riesgos

Supuestos técnicos (no cambian ningún AC):
- S-1: el vacío de la sección 7 de la especificación queda sin definir. Para tener un contrato estable, `puntaje` es `null` en FRAUDE y SIN_SENALES, y el promedio de los demás casos incluye todas las señales. Ninguna prueba verifica `puntaje` ni la inclusión de señales de fraude en esos casos.
- S-2: los umbrales viven en un repositorio en memoria inyectado en `create_app`; no hay carga real de configuración (fuera de alcance).
- S-3: "sin umbrales configurados" significa que el `cliente_id` no existe en el repositorio. Una config parcial no existe: `UmbralesCliente` exige ambos valores.
- S-4: el código HTTP 404 y el nombre `CLIENTE_SIN_CONFIGURACION` son elección de diseño; la especificación solo exige un error que indique que falta la configuración.
- S-5: el puntaje es `float` sin redondeo; los datos de los AC dan promedios exactos.
- S-6: puntajes fuera de 0 a 100 en la entrada se rechazan con 422 (consecuencia de la escala de RN-1/RN-3, no es un AC).
- S-7: el identificador del cliente llega en el cuerpo (`cliente_id`); no hay autenticación (fuera de alcance).

Riesgos:
- R-1: errores de redondeo en comparaciones con float si se usan puntajes decimales. Mitigación: comparar el promedio sin redondear; los AC usan enteros.
- R-2: la precedencia de motivos (RN-11) es fácil de invertir. Mitigación: AC-7 y AC-9 la cubren de forma explícita.
- R-3: la decisión de S-4 puede no coincidir con lo que espera el cliente; se confirma al aprobar el plan.

Bloqueos: ninguno.
- Aprobación del equipo (H3): se aceptan S-1 a S-7. Corrección: la prueba de AC-11 debe ejercitar los datos del AC, no inspeccionar el enum.
