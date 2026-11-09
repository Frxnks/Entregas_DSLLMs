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

Para esta demo **no necesitas abrir Docker Desktop**: MIRA CU-1 se ejecuta con procesos locales de Python y Node.js. Requiere Python 3.12 y Node.js 20.

### Paso 1: abre PowerShell en la carpeta correcta

Abre la carpeta raíz del repositorio en VS Code y selecciona **Terminal → Nueva terminal**. Confirma que la ruta actual termina en `Entregas_DSLLMs`. Todos los comandos de esta guía se ejecutan desde esa carpeta.

### Paso 2: instala las dependencias

Haz esto una sola vez por equipo. Si ya completaste correctamente alguno de estos comandos, no hace falta repetirlo:

```powershell
python -m venv entrega3\.venv
entrega3\.venv\Scripts\python.exe -m pip install -e "entrega3\service[test]"
npm.cmd --prefix frontend ci
```

Se usa `npm.cmd` para evitar el bloqueo de scripts `npm.ps1` de PowerShell.

### Paso 3: comprueba el archivo `.env`

La configuración local está en **`entrega3\service\.env`** (no en la raíz del repositorio). Si el archivo todavía no existe, créalo copiando el ejemplo:

```powershell
if (-not (Test-Path "entrega3\service\.env")) { Copy-Item "entrega3\service\.env.example" "entrega3\service\.env" }
```

Abre ese archivo para editarlo:

```powershell
notepad entrega3\service\.env
```

Para ensayar sin llamadas a Gemini, deja configurado `LLM_PROVIDER=demo`. **No necesitas una clave API para este modo.** Conserva también esta configuración del navegador:

```dotenv
LLM_PROVIDER=demo
MIRA_CORS_ORIGIN=http://localhost:3000
```

Si necesitan mostrar Gemini en vivo, obtengan una clave en [Google AI Studio](https://aistudio.google.com/app/apikey) y péguenla únicamente después de `GEMINI_API_KEY=` en el archivo local `.env`. En ese caso, cambien también a `LLM_PROVIDER=gemini`. No escriban la clave en esta guía, no la compartan ni la incluyan en capturas o commits. Usen Gemini solo si antes verificaron que hay cuota disponible; no habiliten facturación para la demo.

La API lee esta configuración cuando se inicia. Si cambias el proveedor, guarda `.env` y reinicia la API.

### Paso 4: prepara la base e índices

Ejecuta este comando desde la raíz si es la primera vez en este equipo o si aún no se preparó la base:

```powershell
entrega3\.venv\Scripts\python.exe -m mira_cu1.prepare
```

La preparación importa el kit e indexa sus documentos. La primera vez puede tardar y descargar el modelo de embeddings. Cuando termine sin errores, continúa con el inicio de los servicios.

## Iniciar la aplicación

### Paso 5: inicia el servidor MCP

Abre una **segunda terminal PowerShell** en la raíz del repositorio. Ejecuta este comando y deja la terminal abierta:

```powershell
entrega3\.venv\Scripts\python.exe -m mira_cu1.mcp_server
```

### Paso 6: inicia la API

Abre una **tercera terminal PowerShell**, también en la raíz. Ejecuta este comando y deja la terminal abierta:

```powershell
entrega3\.venv\Scripts\python.exe -m mira_cu1.main
```

### Paso 7: inicia la interfaz web

Abre una **cuarta terminal PowerShell** en la raíz. Ejecuta este comando y deja la terminal abierta:

```powershell
npm.cmd --prefix frontend run dev
```

En total quedan abiertas cuatro terminales: la primera que usaste para preparar, más las tres de MCP, API y frontend. No cierres las terminales de los servicios mientras haces la demo.

### Paso 8: verifica y abre la aplicación

Vuelve a la primera terminal —la que usaste para preparar— y comprueba que la API responde:

```powershell
Invoke-RestMethod http://127.0.0.1:8002/api/health
```

La respuesta debe indicar `status: ok`. Luego abre [http://localhost:3000/asistente](http://localhost:3000/asistente). Debe aparecer el asistente del operador y una sesión iniciada como U-01. En el modo demo, el proveedor debe aparecer como `demo` y el modelo como `demo-determinista`.

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
