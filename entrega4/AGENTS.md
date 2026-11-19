# MIRA · Entrega 4 · Contexto para agentes

## Qué es MIRA
MIRA (DPRIME SpA) es una plataforma que evalúa solicitudes de reembolso de gastos médicos. Un motor de análisis produce señales con puntaje sobre la evidencia de cada caso; MIRA decide qué hacer con el caso según umbrales configurables por cliente. Todos los datos de este proyecto son ficticios.

## Qué se construye en esta entrega
Un módulo pequeño e independiente en Python (src/mira_decision) que recibe un caso ya analizado y entrega su decisión, con una API mínima en FastAPI. El alcance exacto lo define la especificación aprobada por el representante del cliente en docs/trabajo/. Nada se implementa sin esa aprobación.

## Stack y comandos
- Python 3.12, FastAPI, pydantic, pytest.
- Código en src/mira_decision/, pruebas en tests/.
- Correr pruebas: python -m pytest -q (desde entrega4/, con el .venv activo).

## Reglas para todos los agentes
- Las reglas de negocio salen solo de la especificación aprobada y de las respuestas del cliente registradas en docs/trabajo/. Si algo no está, se pregunta; no se inventa.
- Cada traspaso entre agentes se hace con un archivo en docs/trabajo/ con prefijo numérico (01-, 02-, ...). El siguiente agente lee ese archivo, no el historial del chat.
- Los criterios de aceptación se identifican como AC-1, AC-2, ... y se citan en tareas, código y pruebas.
- Nadie trabaja fuera de entrega4/.
- No se escriben secretos ni datos reales.

## Convención de commits
- "[IA] ..." para contenido generado por un agente sin cambios.
- "[EQUIPO] ..." para cambios hechos o corregidos por una persona.
- "[CLIENTE] ..." para aprobaciones y respuestas del representante del cliente.
