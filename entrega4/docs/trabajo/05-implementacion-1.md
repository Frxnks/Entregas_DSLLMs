Agente: desarrollador · Skills cargadas: verificador-trazabilidad

# Implementación · Vuelta 1

## Tareas completadas
T-1 a T-7 del plan (04-plan.md), en orden. Las pruebas se escribieron antes que el código.
- T-1 models.py (AC-11): `Decision` sin RECHAZAR; la prueba `test_ac11_nunca_rechaza` usa los datos del AC (umbral 85, mínimo 0, señales 0 y 0), conforme a la corrección de H3.
- T-2 config.py (AC-14).
- T-3 a T-5 decision.py (AC-1 a AC-10), con precedencia FRAUDE, SIN_SENALES, SENAL_BAJO_MINIMO, PUNTAJE_BAJO_UMBRAL.
- T-6 pruebas AC-11, AC-12, AC-13.
- T-7 api.py: POST /decisiones; 404 con CLIENTE_SIN_CONFIGURACION; 422 estándar.

## Archivos cambiados
- src/mira_decision/models.py, config.py, decision.py, api.py (nuevos; __init__.py ya existía y no se tocó)
- tests/test_decision.py, tests/test_config.py, tests/test_api.py (nuevos)

Pruebas adicionales fuera de AC (S-6): `test_puntaje_fuera_de_rango_se_rechaza_en_modelo`, `test_api_puntaje_fuera_de_rango_422`, `test_ac14_cliente_configurado_se_obtiene`. Ninguna prueba verifica `puntaje` en FRAUDE o SIN_SENALES (vacío de la sección 7).

## Salida de pytest
```
...................                                                      [100%]
============================== warnings summary ===============================
.venv\Lib\site-packages\fastapi\testclient.py:1
  C:\Users\a7xsl\OneDrive\Escritorio\LLMS\Trabajo2\Entregas_DSLLMs\entrega4\.venv\Lib\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
19 passed, 1 warning in 4.63s
```
(Salida truncada con `tail -20`; incluye el resumen completo.)

## Verificador de trazabilidad
```
| AC | En plan | Pruebas | Estado |
|---|---|---|---|
| AC-1 | SI | test_decision.py::test_ac1_puntaje_es_promedio_simple | OK |
| AC-2 | SI | test_api.py::test_ac2_api_aprueba_y_devuelve_motivo, test_decision.py::test_ac2_aprueba_sobre_umbral | OK |
| AC-3 | SI | test_decision.py::test_ac3_aprueba_con_puntaje_igual_al_umbral | OK |
| AC-4 | SI | test_decision.py::test_ac4_deriva_bajo_umbral | OK |
| AC-5 | SI | test_decision.py::test_ac5_deriva_por_senal_bajo_minimo_aunque_promedio_alcance | OK |
| AC-6 | SI | test_decision.py::test_ac6_senal_igual_al_minimo_no_deriva | OK |
| AC-7 | SI | test_decision.py::test_ac7_senal_bajo_minimo_precede_a_puntaje_bajo_umbral | OK |
| AC-8 | SI | test_decision.py::test_ac8_fraude_deriva_con_puntaje_alto | OK |
| AC-9 | SI | test_decision.py::test_ac9_fraude_precede_a_otros_motivos | OK |
| AC-10 | SI | test_decision.py::test_ac10_sin_senales_deriva | OK |
| AC-11 | SI | test_decision.py::test_ac11_nunca_rechaza | OK |
| AC-12 | SI | test_decision.py::test_ac12_mismo_caso_distinto_umbral_por_cliente | OK |
| AC-13 | SI | test_decision.py::test_ac13_mismo_caso_distinto_minimo_por_cliente | OK |
| AC-14 | SI | test_api.py::test_ac14_api_cliente_sin_configuracion_responde_error, test_config.py::test_ac14_cliente_sin_configuracion_lanza_error, test_config.py::test_ac14_cliente_configurado_se_obtiene | OK |

AC en la especificacion: 14
AC completos (tarea y prueba): 14
AC con algo faltante: 0
RESULTADO: OK
```

## Hallazgos atendidos
No aplica (vuelta 1).

## Bloqueos
Ninguno. Todas las pruebas pasan. Nota: advertencia de deprecación de httpx/starlette en TestClient, sin efecto en los resultados.
