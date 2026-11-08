# Entrega 3 · Asistente del operador de revisión (CU-1)

Esta carpeta contiene el caso de uso CU-1 de MIRA. El asistente explica por qué un caso fue derivado, recupera reglas con citas y consulta datos mediante un servidor MCP. Puede preparar una solicitud de antecedentes, pero solo la registra después de una confirmación humana válida.

## Componentes

- `service/mira_cu1/rag.py`: indexación y consulta documental independientes.
- `service/mira_cu1/mcp_server.py`: servidor FastMCP por Streamable HTTP.
- `service/mira_cu1/main.py`: API de conversación y confirmación.
- `service/mira_cu1/database.py`: importación inmutable del Excel a SQLite.
- `evaluacion/golden_set.json`: 20 preguntas documentales fijadas antes de la primera evaluación completa.
- `evaluacion/matriz_integracion.md`: pruebas RAG + MCP y controles.
- `insumos/`: copia sin modificaciones del kit oficial de CU-1.
- `frontend/src/app/asistente`: interfaz integrada a MIRA.

## Inicio local en Windows

Requiere Python 3.12 y Node.js 20. Desde la raíz del repositorio:

```powershell
python -m venv entrega3/.venv
entrega3/.venv/Scripts/python.exe -m pip install -e "entrega3/service[test]"
Copy-Item entrega3/service/.env.example entrega3/service/.env
entrega3/.venv/Scripts/python.exe -m mira_cu1.prepare
```

La preparación importa el Excel, comprueba los registros originales e indexa dos estrategias de fragmentación. La primera ejecución descarga la variante ONNX cuantizada del modelo de embeddings para reducir el uso de memoria en Windows.

Para usar Gemini, edite `entrega3/service/.env` y complete `GEMINI_API_KEY`. Para recorrer la interfaz sin una clave externa, configure `LLM_PROVIDER=demo`; la interfaz identifica claramente ese modo y sus resultados no se usan como métricas del LLM.

Abra tres terminales:

```powershell
entrega3/.venv/Scripts/python.exe -m mira_cu1.mcp_server
entrega3/.venv/Scripts/python.exe -m mira_cu1.main
npm --prefix frontend run dev
```

Abra `http://localhost:3000/asistente`.

## Pruebas y evaluación

```powershell
entrega3/.venv/Scripts/python.exe -m pytest entrega3/service/tests
entrega3/.venv/Scripts/python.exe -m mira_cu1.evaluate --top-k 5
npm --prefix frontend run typecheck
```

El evaluador guarda los resultados reproducibles en `entrega3/var/retrieval_evaluation.json`. `--lexical` sirve para diagnosticar la estructura sin embeddings; no reemplaza la métrica semántica final.

La evaluación de generación requiere Gemini y MCP activos. Consulte la [guía de revisión manual de generación](evaluacion/guia_revision_generacion.md); el modo demo no produce métricas del LLM.

## Cliente MCP externo

Con el servidor MCP activo y una sesión creada por la API:

```powershell
entrega3/.venv/Scripts/python.exe -m mira_cu1.cli_client consultar_caso --session ID_DE_SESION --case C-012
```

El cliente demuestra que FastMCP responde por `http://127.0.0.1:8001/mcp`. La identidad se resuelve desde una sesión opaca y los permisos se vuelven a validar en el servidor.

## Controles principales

- El modelo nunca recibe SQL ni accede directamente a SQLite.
- Las lecturas no crean eventos de negocio.
- Las escrituras exigen una confirmación de un solo uso y vuelven a comprobar rol, organización, estado y límites.
- Los registros originales del Excel tienen protección contra actualización y eliminación.
- Los datos enviados al proveedor pasan por sanitización y excluyen nombres, claves, rutas y tokens.
- Los documentos pueden contradecirse; el asistente conserva versiones, muestra conflictos vigentes y se abstiene cuando falta respaldo.

Los datos, organizaciones y personas son ficticios y se usan únicamente con fines docentes.
