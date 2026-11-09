# Arquitectura y declaración de datos enviados al modelo

## Separación de responsabilidades

El motor RAG indexa y recupera documentos estáticos desde ChromaDB. El servidor MCP gobierna el acceso a RAG y a la base operacional SQLite. La API conversa con Gemini y usa un cliente MCP; no abre tablas operacionales.

Antes de cada respuesta de Gemini, la API invoca `buscar_reglas` por MCP y agrega el resultado sanitizado al contexto como evidencia no confiable. La búsqueda y sus citas se conservan en la respuesta incluso si Gemini no solicita herramientas adicionales. Las demás herramientas MCP permiten consultas o propuestas específicas; el modelo no recibe acceso directo a SQLite. La indexación se ejecuta fuera del servidor y puede evaluarse sin un LLM.

## Datos enviados

| Categoría | Datos permitidos |
|---|---|
| Fragmentos | Texto necesario, código, sección, versión y vigencia. |
| Caso | ID ficticio, tipo, estado, puntaje y motivo. |
| Señales | Código, valor, mínimo, indicador de fraude y detalle necesario. |
| Solicitudes | ID ficticio, fecha, documentos, motivo y estado. |
| Umbrales | Valores e identificadores ficticios de aprobadores. |
| Evidencias | Extracto mínimo después de sanitización. |

Se excluyen claves API, tokens de sesión o confirmación, rutas locales y nombres de usuarios. El filtro reemplaza RUT, correo, teléfono y nombres conocidos. Este control reduce exposición accidental; no demuestra anonimización universal ni residencia física en Chile.

## Integridad y auditoría

La importación registra SHA-256 del Excel y de cada fila original. Triggers impiden modificar o eliminar registros entregados. Las solicitudes nuevas se agregan y el estado efectivo se representa mediante eventos. Las consultas registran trazas técnicas separadas y no generan efectos de negocio.
