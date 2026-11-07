# Evaluación de generación con Gemini

## Preparación

La clave se obtiene en https://aistudio.google.com/apikey. Configurar un proyecto sin facturación y comprobar su cuota en AI Studio. El script no activa facturación ni puede certificar el estado de la cuenta.

Desde PowerShell en la raíz del repositorio:

```powershell
.\entrega3\configurar-gemini.ps1
.\entrega3\.venv\Scripts\python.exe -m mira_cu1.evaluate_generation --check
```

No pegar claves en chat, capturas ni Git. `service/.env` está excluido del repositorio. El iniciador `iniciar-demo.ps1` sigue siendo exclusivamente para demostración sin Gemini.

## Aceptación

Nikolas debe revisar `revision_nikolas.html`, informar correcciones y aprobar por escrito su versión identificada por hash. Registrar fecha real y referencia de esa evidencia en `golden_set.json`, actualizar `client_validation.status` a `approved` y hacer commit antes de evaluar. No basta con designar un representante.

## Ejecución

```powershell
.\entrega3\.venv\Scripts\python.exe -m mira_cu1.evaluate_generation --strategy sections
```

El evaluador usa Gemini real, recupera el corpus local y permite únicamente `buscar_reglas`. No consulta SQLite. Guarda cada resultado en `entrega3/var/generation/<hash>_sections/` y conserva respuesta, contexto recuperado, herramientas, modelo y consumo informado. Repetir el comando reanuda las preguntas pendientes. Un error operacional detiene la corrida y nunca se cuenta como abstención.

## Revisión de resultados

Los campos `human_review` quedan sin calificar hasta una revisión real. Para cada respuesta:

- Precisión de citas: citas usadas que sostienen la afirmación / citas usadas. La lista recuperada no equivale a citas usadas.
- Fidelidad: afirmaciones respaldadas por el contexto / afirmaciones verificables.
- Abstención correcta: en N01–N04, abstención explícita sin inventar datos. Informar también errores operacionales por separado.
- Abstención injustificada: abstenerse en una pregunta respondible con evidencia suficiente.
- Conflictos/versiones: mostrar ambas fuentes vigentes sin elegir; distinguir v1 derogada y v2 vigente.
- Clasificación del fallo: recuperación si falta el pasaje necesario; generación si estaba presente pero la respuesta falla; operacional si el proveedor no respondió.

No asignar automáticamente fidelidad o precisión de citas a partir de que se haya recuperado un fragmento. Mantener resultados de modelos distintos identificados por pregunta y por llamada.
