Agente: revisor · Skills cargadas: revision-contra-spec

# Revisión · vuelta 1

Veredicto: APROBADO
Entregable revisado: docs/trabajo/05-implementacion-1.md

## 1. Evaluación por AC
| AC | R1 Implementado | R2 Probado | R3 Prueba válida | R4 Sin reglas inventadas | Evidencia |
|---|---|---|---|---|---|
| AC-1 | SÍ | SÍ | SÍ | SÍ | src/mira_decision/decision.py:L23 (promedio simple); tests/test_decision.py:L25-27 `test_ac1_puntaje_es_promedio_simple` (95, 93, umbral 90, mínimo 50; assert puntaje == 94) |
| AC-2 | SÍ | SÍ | SÍ | SÍ | decision.py:L27-32; test_decision.py:L30-33 `test_ac2_aprueba_sobre_umbral`; test_api.py:L16-24 `test_ac2_api_aprueba_y_devuelve_motivo` (200, APROBAR, PUNTAJE_SOBRE_UMBRAL) |
| AC-3 | SÍ | SÍ | SÍ | SÍ | decision.py:L27 (`>=`); test_decision.py:L36-39 (80, 90, umbral 85, puntaje igual al umbral) |
| AC-4 | SÍ | SÍ | SÍ | SÍ | decision.py:L33; test_decision.py:L42-45 (80, 88, umbral 85) |
| AC-5 | SÍ | SÍ | SÍ | SÍ | decision.py:L25-26; test_decision.py:L48-51 (100, 100, 40, umbral 70, mínimo 50) |
| AC-6 | SÍ | SÍ | SÍ | SÍ | decision.py:L25 (`<` estricto); test_decision.py:L54-57 (100, 50, umbral 70, mínimo 50) |
| AC-7 | SÍ | SÍ | SÍ | SÍ | decision.py:L25-27 (mínimo evaluado antes que umbral); test_decision.py:L60-64 (40, 60, umbral 85) |
| AC-8 | SÍ | SÍ | SÍ | SÍ | decision.py:L18-19; test_decision.py:L67-70 (99 fraude, 99, umbral 85) |
| AC-9 | SÍ | SÍ | SÍ | SÍ | decision.py:L18-19 (fraude primero); test_decision.py:L73-77 (10 fraude, 20) |
| AC-10 | SÍ | SÍ | SÍ | SÍ | decision.py:L20-21; test_decision.py:L80-83 (sin señales, umbral 85, mínimo 50) |
| AC-11 | SÍ | SÍ | SÍ | SÍ | models.py:L7-9 (Decision sin RECHAZAR) y decision.py:L17-33; test_decision.py:L86-90 usa los datos del AC (umbral 85, mínimo 0, señales 0 y 0) y verifica DERIVAR_A_REVISION, conforme a la corrección H3 |
| AC-12 | SÍ | SÍ | SÍ | SÍ | decision.py:L27; test_decision.py:L93-98 (mismo caso 80, 80; umbrales 70 y 90) |
| AC-13 | SÍ | SÍ | SÍ | SÍ | decision.py:L25; test_decision.py:L101-107 (100, 100, 60; mínimos 50 y 70; motivo SENAL_BAJO_MINIMO para B) |
| AC-14 | SÍ | SÍ | SÍ | SÍ | config.py:L15-19 (sin valores por defecto) y api.py:L17-21 (404 CLIENTE_SIN_CONFIGURACION); test_config.py:L8-11; test_api.py:L27-36 (señales 95 y 93, cliente no configurado, sin clave "decision" en la respuesta) |

## 2. Evidencia de ejecución
- pytest según el entregable: 19 passed, 1 warning (deprecación de httpx en TestClient, sin efecto).
- Verificador de trazabilidad según el entregable: RESULTADO: OK (14 de 14 AC con tarea y prueba).
- ¿Coincide con el código revisado?: SÍ. Se cuentan 19 pruebas en tests/ (14 en test_decision.py, 2 en test_config.py, 3 en test_api.py) y los nombres test_ac<n>_ de la tabla del verificador existen en los archivos indicados.

Notas de revisión (no son hallazgos):
- El puntaje None en FRAUDE y SIN_SENALES (decision.py:L19, L21) corresponde al supuesto S-1, aprobado en H3. Ninguna prueba lo verifica, como exige la sección 7 de la especificación.
- La validación 0 a 100 (models.py:L21, L31-32), el código 404 y el nombre CLIENTE_SIN_CONFIGURACION corresponden a los supuestos S-4 y S-6, aprobados en H3. Las pruebas adicionales de rango (test_decision.py:L110-112, test_api.py:L39-43) no sustituyen ninguna prueba de AC.

## 3. Hallazgos
Ninguno.

## 4. Qué debe corregir el desarrollador
No aplica.

## 5. Para el representante del cliente
No aplica en este veredicto (APROBADO). Queda lista para la aceptación final.
