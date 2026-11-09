# Guía para probar y presentar MIRA CU-1

Esta guía permite ensayar la interfaz antes de la exposición y hacer una demostración breve del asistente, sus citas, las trazas MCP y sus límites. Los datos del kit son ficticios.

## Qué conviene mostrar

Sí, es recomendable mostrar la aplicación funcionando: hace visible el flujo de conversación, la evidencia documental y las herramientas MCP. La rúbrica pide recorrer **D1–D8 en vivo**, por lo que las tres preguntas siguientes son un ensayo rápido, no sustituyen el guion completo de la [demostración D1–D8](docs/guion-demo.md):

1. **Respuesta con evidencia:** «¿Cuál es el mínimo de DOC_AUT?» Luego abre una cita POL-DEC v2, sección 3, y la traza MCP.
2. **Abstención:** «¿Cuál es el costo monetario de una solicitud de antecedentes?» Muestra que el asistente no inventa un dato que no está en el corpus.
3. **Conflicto:** «¿El umbral de revisión es 80 u 85?» Explica que el sistema presenta las dos fuentes y deja la decisión a una persona.

Si hay tiempo, muestra una solicitud de antecedentes **preparada pero todavía sin confirmar**. Puedes explicar que la aplicación solo la registra después de una confirmación humana explícita. Confirmar una solicitud escribe en la base local de pruebas; hazlo únicamente si estás usando los datos ficticios de la entrega y quieres mostrar esa escritura.

## Recomendación para la exposición

Para una demostración repetible y sin llamadas externas, usa el modo `demo`. La aplicación identifica ese modo; sus respuestas sirven para recorrer el flujo visual, **no son resultados de Gemini ni métricas de generación**. La evaluación real de Gemini está en [la guía de revisión de generación](evaluacion/guia_revision_generacion.md).

Usa Gemini en vivo solo si necesitas mostrar explícitamente ese proveedor, la clave local está configurada y has comprobado antes de presentar que el proyecto tiene cuota disponible. Las solicitudes dependen de la cuota y facturación del proyecto de AI Studio. No habilites facturación para la demostración, no muestres la clave ni la incluyas en capturas o commits.

## Preparación inicial

Desde PowerShell, abre la carpeta raíz del repositorio. Requiere Python 3.12 y Node.js 20.

Si aún no existen el entorno virtual o las dependencias, ejecuta una vez:

```powershell
python -m venv entrega3\.venv
entrega3\.venv\Scripts\python.exe -m pip install -e "entrega3\service[test]"
npm --prefix frontend ci
```

La interfaz del asistente llama por defecto a `http://127.0.0.1:8002/api`; el origen web predeterminado es `http://localhost:3000`. En `entrega3/service/.env`, selecciona el modo demo para ensayar:

```dotenv
LLM_PROVIDER=demo
MIRA_CORS_ORIGIN=http://localhost:3000
```

No compartas ni reemplaces la línea `GEMINI_API_KEY` por una clave en la documentación. La configuración se lee al iniciar la API: si cambias de proveedor, detén y vuelve a iniciar esa terminal.

Prepara la base e índices si todavía no están creados o si acabas de configurar el equipo por primera vez:

```powershell
entrega3\.venv\Scripts\python.exe -m mira_cu1.prepare
```

La preparación importa el kit e indexa sus documentos. La primera vez puede tardar y descargar el modelo de embeddings.

## Iniciar la aplicación

Deja abiertas tres terminales PowerShell, todas desde la raíz del repositorio:

**Terminal 1 — servidor MCP**

```powershell
entrega3\.venv\Scripts\python.exe -m mira_cu1.mcp_server
```

**Terminal 2 — API**

```powershell
entrega3\.venv\Scripts\python.exe -m mira_cu1.main
```

**Terminal 3 — interfaz web**

```powershell
npm --prefix frontend run dev
```

Abre [http://localhost:3000/asistente](http://localhost:3000/asistente). Debe aparecer el asistente del operador y una sesión iniciada como U-01. Antes de ensayar, puedes comprobar que la API responde:

```powershell
Invoke-RestMethod http://127.0.0.1:8002/api/health
```

La respuesta debe indicar `status: ok`. En el modo demo, el proveedor debe aparecer como `demo` y el modelo como `demo-determinista`.

## Recorrido visual sugerido

1. Elige el usuario U-01 (operador de ORG-01) en el selector de la interfaz.
2. Envía «¿Cuál es el mínimo de DOC_AUT?».
3. Abre al menos una cita para mostrar código, sección, versión, vigencia y texto. Expande **Traza MCP** para mostrar la llamada `buscar_reglas`.
4. Envía «¿Cuál es el costo monetario de una solicitud de antecedentes?». Muestra el estado `abstencion`.
5. Envía «¿El umbral de revisión es 80 u 85?». Si el resultado está en modo demo, abre las dos referencias en conflicto y explica por qué el asistente no decide cuál prevalece.
6. Si quieres mostrar una acción, pide preparar una solicitud válida y deja visible la propuesta sin pulsar **Confirmar y registrar**. Si decides pulsarlo durante el ensayo, recuerda que modifica la base local ficticia.
7. Cierra explicando que la decisión final corresponde a una persona y que los datos son de prueba.

El comportamiento demo es determinista y adecuado para ensayar. Gemini puede responder de forma diferente y generar citas irrelevantes; no prometas que cada respuesta en vivo será idéntica a la demostración ensayada.

## Si algo falla

- **La página no abre:** comprueba que la terminal del frontend siga activa y usa `http://localhost:3000/asistente`.
- **La interfaz informa que el servicio no está disponible:** confirma que MCP y la API estén activos en sus terminales. MCP debe iniciarse antes de enviar preguntas.
- **Error de origen o CORS:** abre la web con `localhost` (no `127.0.0.1`) o confirma que `MIRA_CORS_ORIGIN` coincida exactamente con el origen del navegador; luego reinicia la API.
- **No se inicia la sesión:** verifica que el servidor MCP está activo y que la preparación de la base e índices terminó correctamente.
- **Cuota o error de Gemini:** para la demostración cambia a `LLM_PROVIDER=demo`, reinicia la API y deja claro que es el recorrido visual, no una evaluación de Gemini. No actives facturación para resolverlo.
- **Puerto ocupado:** detén la otra instancia del mismo servicio antes de volver a iniciarlo. No cierres procesos desconocidos.

Al terminar, detén cada servicio con `Ctrl+C` en su terminal. No es necesario dejar servidores corriendo después del ensayo.

## Checklist antes de presentar

- [ ] Probé la ruta `/asistente` desde el mismo computador y navegador que usaré.
- [ ] Elegí y verifiqué el proveedor antes de iniciar la API.
- [ ] Las tres terminales arrancan sin errores y `/api/health` responde.
- [ ] Practiqué las preguntas de evidencia, abstención y conflicto.
- [ ] Puedo abrir una cita y expandir la traza MCP.
- [ ] Tengo claro que confirmar una acción escribe en la base local de prueba.
- [ ] No mostraré claves, archivos `.env` ni datos distintos del kit ficticio.
- [ ] Si uso modo demo, indicaré que es determinista y no corresponde a métricas reales de Gemini.
