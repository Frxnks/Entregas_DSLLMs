# MIRA · Entrega 4 · Sistema multiagente (Alternativa A)

## Qué es
Sistema de 4 agentes (analista, planificador, desarrollador, revisor) que lleva una necesidad del cliente de MIRA a código con pruebas en verde (Alternativa A, SDD). Patrón secuencial con controles humanos y ciclo desarrollador–revisor de máximo 2 vueltas (ver docs/decision.md).

## Estructura
    .claude/
      agents/        definición de los 4 agentes
      skills/        historia-gwt, revision-contra-spec, verificador-trazabilidad
      hooks/         registro de herramientas
      settings.json
    docs/
      decision.md        diseño del sistema
      bitacora.md        invocaciones, decisiones humanas y fallas
      guia-corrida.md    cómo lanzar el flujo
      trabajo/           archivos de traspaso 01 a 07
      evidencia/         traza de herramientas y métricas
      linea-base/        comparación con un agente único
    src/mira_decision/   módulo de decisión y API
    tests/               pruebas
    scripts/             reiniciar_corrida.ps1
    AGENTS.md            reglas para todos los agentes

## Requisitos
Windows con PowerShell, Python 3.12, Git, VS Code con Claude Code 2.1.302 y una cuenta Claude con plan pagado.

## Instalación
    py -3.12 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -e ".[dev]"

## Verificar la corrida entregada
    .\.venv\Scripts\python.exe -m pytest -q
    .\.venv\Scripts\python.exe .claude/skills/verificador-trazabilidad/scripts/verificar.py
Resultado esperado: 19 pruebas pasan y el verificador termina con RESULTADO: OK.

## Probar la API
Cliente-a (umbral 70, mínimo 50) y cliente-b (umbral 90, mínimo 50) están definidos en src/mira_decision/demo.py.

    .\.venv\Scripts\python.exe -m uvicorn mira_decision.demo:app --port 8000

En otra terminal:

    Invoke-RestMethod -Method Post -Uri http://localhost:8000/decisiones -ContentType "application/json" -Body '{"cliente_id":"cliente-a","senales":[{"puntaje":80},{"puntaje":80}]}'

Devuelve decision APROBAR, motivo PUNTAJE_SOBRE_UMBRAL, puntaje 80. El mismo caso con cliente-b devuelve DERIVAR_A_REVISION (PUNTAJE_BAJO_UMBRAL).

## Lanzar el flujo sobre el caso
Ver docs/guia-corrida.md: rama nueva, scripts/reiniciar_corrida.ps1 y las etapas. No se reinicia sobre main.

## Dónde está la evidencia
- docs/trabajo/01 a 07
- docs/bitacora.md
- docs/evidencia/traza-herramientas.jsonl
- docs/evidencia/metricas.md
- docs/linea-base/
