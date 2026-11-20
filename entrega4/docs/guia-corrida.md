# Guía para lanzar el flujo multiagente

Herramienta: Claude Code 2.1.302 (extensión de VS Code), con la carpeta entrega4/ abierta como proyecto. Los agentes están en .claude/agents/ y las skills en .claude/skills/. Entre etapas se recomienda /clear; después de modificar un agente hay que abrir un chat nuevo.

## 0. Preparar una corrida nueva (no se hace sobre main)
    git switch -c corrida-<n>
    .\scripts\reiniciar_corrida.ps1
La entrada del caso es docs/trabajo/01-necesidad.md.

## 1. Especificar (analista, 1ra pasada)
Prompt al agente principal:
    Invoca al subagente analista con este prompt exacto: "Primera pasada. Lee docs/trabajo/01-necesidad.md y produce docs/trabajo/02-especificacion.md según tus instrucciones." Cuando termine, muéstrame su respuesta, git status --short y las líneas de la traza del subagente. No modifiques su salida.
Commit: [IA] analista, especificación 1ra pasada

## H1. Aclaraciones (representante del cliente)
El cliente responde las preguntas Q-n en docs/trabajo/03-aclaraciones.md, con fuente para cada respuesta.
Commit: [CLIENTE] respuestas a las aclaraciones (H1)

## 1b. Especificar (analista, 2da pasada)
    Invoca al subagente analista con este prompt exacto: "Segunda pasada. Lee docs/trabajo/01-necesidad.md y docs/trabajo/03-aclaraciones.md y actualiza docs/trabajo/02-especificacion.md según tus instrucciones." Luego muéstrame su respuesta, git status --short y si quedan [NEEDS CLARIFICATION].
Commit: [IA] analista, especificación 2da pasada

## H2. Aprobación de la especificación (representante del cliente, obligatorio)
El cliente revisa reglas, AC y caso de uso, y cambia la línea Estado a APROBADA.
Commit propio: [CLIENTE] Aprueba la especificación (H2)

## 2. Planificar (planificador)
    Invoca al subagente planificador con este prompt exacto: "La especificación docs/trabajo/02-especificacion.md está aprobada por el cliente. Produce docs/trabajo/04-plan.md según tus instrucciones." Luego ejecuta el verificador de trazabilidad y muéstrame la columna "En plan".
Commit: [IA] planificador, plan

## H3. Aprobación del plan (equipo, control extra)
El equipo revisa diseño, contrato, tareas, matriz AC → prueba y supuestos; corrige o aprueba.
Commit: [EQUIPO] Aprueba el plan (H3)

## 3. Implementar (desarrollador, vuelta N)
    Invoca al subagente desarrollador con este prompt exacto: "Vuelta <N>. El plan docs/trabajo/04-plan.md está aprobado por el equipo. Implementa según tus instrucciones y entrega docs/trabajo/05-implementacion-<N>.md." Luego ejecuta tú pytest y el verificador y dime si coinciden con lo que pegó el desarrollador.
Commit: [IA] desarrollador, vuelta <N>

## 4. Revisar (revisor, vuelta N)
    Invoca al subagente revisor con este prompt exacto: "Vuelta <N>. Revisa la implementación entregada en docs/trabajo/05-implementacion-<N>.md contra la especificación aprobada y entrega docs/trabajo/06-revision-<N>.md según tus instrucciones." Luego confirma con git diff --stat src tests que no modificó código.
Commit: [IA] revisor, vuelta <N>
Si el veredicto es CAMBIOS y N = 1, se vuelve al paso 3 con N = 2. Si en N = 2 sigue en CAMBIOS, el revisor escribe ESCALAR A HUMANO.

## H4. Aceptación final (representante del cliente)
El cliente ejecuta él mismo pytest y el verificador, lee el informe del revisor y deja su decisión en docs/trabajo/07-aceptacion.md.
Commit: [CLIENTE] Aceptación final (H4)

## Registro
Cada invocación y cada decisión humana se anota en docs/bitacora.md. La traza de herramientas y skills queda sola en docs/evidencia/traza-herramientas.jsonl (hook PreToolUse).
