# Métricas comparativas · Multiagente (corrida 1) vs. agente único (línea base)

## Tabla comparativa

| Métrica | Multiagente corrida 1 | Agente único línea base |
|---|---|---|
| Duración de reloj | 46 min 17 s (19:20:58 → 20:07:15) | 5 min (20:25 → 20:30) |
| Tiempo de agentes (suma de subagentes) | 3 min 37 s (217 s) | sin dato por separado (todo el trabajo es del agente único: 5 min) |
| Mensajes o prompts humanos | 5 prompts a agentes + 4 decisiones humanas (H1–H4) + 2 correcciones (E1, E2) | 2 mensajes |
| Preguntas de aclaración al cliente | 5 (Q-1 a Q-5) | 3 (una sola ronda) |
| Recomendaciones que contradecían al cliente | No aplica: el analista presenta 2 o 3 opciones por pregunta sin marcar ninguna como recomendada (02-especificacion.md, 1ra pasada, commit a5649c1) | 3 de 3 |
| AC cumplidos de 14 | 14/14 (revisor, vuelta 1) | 9/14 (`evaluar_ac.py`, criterio estricto) |
| AC con prueba trazable | 14/14 (verificador-trazabilidad) | 0/14 (sin ids AC en nombres ni comentarios) |
| Número de pruebas | 19 | 22 |
| Funcionalidad fuera de alcance | 0 endpoints extra (solo `POST /decisiones`) | 2 endpoints (PUT/GET config) + config en memoria + validaciones no pedidas |
| Artefactos de traspaso | 7 (`docs/trabajo/01` a `07`) | 0 |
| Decisiones humanas registradas | 4 (H1–H4) | 0 registradas (1 respuesta del cliente, 3 preguntas) |
| Correcciones del equipo | 2 (E1, E2) | 0 |
| Fallas detectadas y corregidas | 3 (F-1 a F-3) | sin dato (no hay registro) |
| Llamadas a herramientas | 113 (44 de subagentes + 69 del agente principal) | 10 (9 visibles en la transcripción + 1 de preguntas) |

### Detalle por invocación de subagente (traza)

Horas del primer y último registro con ese agente (incluye `SubagentHandback` cuando existe); llamadas = registros de herramienta del agente, sin contar el handback.

| Invocación | Inicio | Fin | Duración | Llamadas |
|---|---|---|---|---|
| analista, 1ra pasada | 19:20:58 | 19:21:41 | 43 s | 7 |
| analista, 2da pasada | 19:38:25 | 19:39:19 | 54 s | 5 |
| planificador | 19:44:30 | 19:45:11 | 41 s | 3 |
| desarrollador | 19:52:25 | 19:53:21 | 56 s | 15 |
| revisor | 20:00:40 | 20:01:03 | 23 s | 14 |
| **Total** | | | **217 s (3 min 37 s)** | **44** |

El revisor no tiene registro `SubagentHandback`; su fin es su último registro (Write). La traza tiene resolución de 1 s.

### Commits de la corrida 1 (de `a7bcb0c` a `6498667`)
[IA] 5 · [EQUIPO] 3 · [CLIENTE] 4 · total 12.

## Fuentes

- Duración de reloj: primer registro del analista en `docs/evidencia/traza-herramientas.jsonl` (19:20:58) y fecha del commit `6498667` en `git log --format='%h %ad %s' --date=iso` (20:07:15). Contando desde el lanzamiento del agente (19:20:54) son 46 min 21 s.
- Tiempo y llamadas de subagentes: `docs/evidencia/traza-herramientas.jsonl`, filtrando por campo `agente`. Llamadas totales: 117 registros hasta 20:05:48 menos 4 `SubagentHandback` = 113; de ellos 44 de subagentes y 69 del principal (incluye 5 lanzamientos `Agent`). Los registros posteriores a 21:03 son de la evaluación de la línea base y no se cuentan.
- Invocaciones, H1–H4, E1–E2, F-1 a F-3: `docs/bitacora.md` secciones 1, 2 y 3.
- Commits por prefijo: `git log --oneline` entre `a7bcb0c` y `6498667`. Se excluye `a751ade` (hook y bitácora), anterior a la necesidad.
- Prompts humanos: 5 prompts a agentes (bitácora, columna "Prompt literal"); no hay dato de los mensajes que el equipo escribió al agente principal.
- Línea base, duración y mensajes: dados por el equipo (20:25–20:30, 2 mensajes, 1 ronda de 3 preguntas). Llamadas: `docs/linea-base/transcripcion-linea-base.txt` (1 búsqueda, 2 comandos, 5 Write, 1 comando = 9, más la ronda de preguntas); las líneas colapsadas "Ran N shell commands" se contaron por su resumen.
- Recomendaciones contradictorias: `docs/linea-base/evaluacion.md` sección 3 (capturas).
- AC cumplidos línea base: `python docs/linea-base/evaluar_ac.py`; multiagente: `docs/trabajo/06-revision-1.md`.
- AC con prueba trazable y pruebas: verificador-trazabilidad según `docs/bitacora.md` fila 4 (14/14, 19 pruebas); línea base: `docs/linea-base/evaluacion.md` sección 4 (22 casos, 0 ids de AC).
- Fuera de alcance: `grep` de rutas en `src/mira_decision/api.py` (una ruta, `POST /decisiones`); línea base: `evaluacion.md` sección 2.
- Artefactos de traspaso: `ls docs/trabajo` (01 a 07).
- Tokens: sin dato; la traza no los registra.

## Lectura

- El multiagente tardó casi 9 veces más en reloj (46 min vs. 5 min). Es desfavorable, aunque incluye esperas por revisión humana (H1–H4) y correcciones del equipo.
- El trabajo propio de los agentes fue de 3 min 37 s: la diferencia de reloj es casi toda coordinación y revisión humana, no cómputo.
- El multiagente cumplió 14/14 AC contra 9/14 de la línea base, y las 5 fallas de la línea base (motivo al aprobar, precedencia) vienen de preguntas que no hizo.
- La línea base propuso RECHAZAR en las 3 recomendaciones, contra lo que el cliente quería; solo se evitó porque el cliente las descartó.
- El multiagente exigió más intervención (4 decisiones, 2 correcciones, 3 fallas de configuración de agentes) y más llamadas a herramientas (113 vs. 10), pero dejó 7 artefactos de traspaso y trazabilidad AC → prueba (0 en la línea base).
- La línea base escribió más pruebas (22 vs. 19) y más funcionalidad (endpoints de configuración), pero fuera de alcance y sin trazabilidad.

## Limitaciones de la comparación

- Una sola corrida de cada enfoque: no hay variabilidad medida.
- Mismo modelo (Sonnet) en ambos.
- La línea base recibió las mismas respuestas del cliente, pero conocía solo la necesidad y esas respuestas, no la especificación aprobada.
- El criterio estricto de motivo (AC-2, 3, 6, 7, 9) lo definió el equipo; con "lista vacía = PUNTAJE_SOBRE_UMBRAL" la línea base llega a 12/14.
- Las llamadas de la línea base salen de una transcripción con líneas colapsadas, y las del multiagente de una traza con resolución de 1 s; no son medidas homogéneas.
- Tokens no disponibles en el plan usado; no se compara costo.
- La corrida 1 fue un ensayo con fallas de configuración de agentes (F-1 a F-3) corregidas durante ella.
