# Bitácora del sistema multiagente · Entrega 4

Convenciones: una fila por invocación de agente o decisión humana. El prompt se copia literal. Las skills cargadas se toman de docs/evidencia/traza-herramientas.jsonl.

## 1. Registro de corridas
| # | Fecha y hora | Corrida | Etapa | Agente o persona | Prompt literal | Skills cargadas | ¿Cumplió su contrato? | Nota |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-19 19:21 | 1 (ensayo) | Especificar (1ra pasada) | analista | Primera pasada. Lee docs/trabajo/01-necesidad.md y produce docs/trabajo/02-especificacion.md según tus instrucciones. | ninguna según traza | SÍ | 10 AC en G/W/T y 5 preguntas Q-1..Q-5; leyó la skill historia-gwt con Read (sin herramienta Skill) y omitió la línea "Agente: ... · Skills cargadas: ..." que exige AGENTS.md. |

## 2. Decisiones humanas
| Punto | Fecha | Quién | Qué revisó | Decisión | Commit |
|---|---|---|---|---|---|
| H1 | 2026-11-19 | Nikolas Lagos (cliente) | Preguntas Q-1 a Q-5 de 02-especificacion.md | Respondió ACL-1 a ACL-5; ACL-2 y ACL-3 descartan el rechazo automático que pedía la necesidad (DEC-04) | (commit pendiente) |

## 3. Fallas y cambios
| ID | Corrida | Qué pasó | Categoría MAST | Causa (archivo y línea del agente o skill) | Cambio (commit) | Re-ejecución |
|---|---|---|---|---|---|---|
| F-1 | 1 | El analista omitió la línea de encabezado "Agente · Skills cargadas" que exige AGENTS.md | Especificación del sistema (FM-1.1, incumplir la especificación de la tarea) | La regla estaba solo en AGENTS.md y no en "# Entregables" de .claude/agents/analista.md | (commit pendiente) | 2da pasada del analista |
| F-2 | 1 | El analista no cargó historia-gwt como skill; la leyó como archivo con Read (la traza no muestra la herramienta Skill) | Especificación del sistema (FM-1.1) | El frontmatter tools de .claude/agents/analista.md (línea 4) no incluía Skill | (commit pendiente) | 2da pasada del analista |

## 4. Supuestos y excepciones
- Representante del cliente: Nikolas Lagos repite el rol de las entregas anteriores con autorización del profesor (excepción a la rotación del enunciado 4.5).
- ACL-4 (cliente sin umbrales configurados → error) es una decisión del cliente sin fuente en las entregas anteriores.
