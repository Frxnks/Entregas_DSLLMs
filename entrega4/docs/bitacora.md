# Bitácora del sistema multiagente · Entrega 4

Convenciones: una fila por invocación de agente o decisión humana. El prompt se copia literal. Las skills cargadas se toman de docs/evidencia/traza-herramientas.jsonl.

## 1. Registro de corridas
| # | Fecha y hora | Corrida | Etapa | Agente o persona | Prompt literal | Skills cargadas | ¿Cumplió su contrato? | Nota |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-19 19:21 | 1 (ensayo) | Especificar (1ra pasada) | analista | Primera pasada. Lee docs/trabajo/01-necesidad.md y produce docs/trabajo/02-especificacion.md según tus instrucciones. | ninguna según traza | SÍ | 10 AC en G/W/T y 5 preguntas Q-1..Q-5; leyó la skill historia-gwt con Read (sin herramienta Skill) y omitió la línea "Agente: ... · Skills cargadas: ..." que exige AGENTS.md. |
| 2 | 2026-11-19 19:38 | 1 (ensayo) | Especificar (2da pasada) | analista | Segunda pasada. Lee docs/trabajo/01-necesidad.md y docs/trabajo/03-aclaraciones.md y actualiza docs/trabajo/02-especificacion.md según tus instrucciones. | historia-gwt (herramienta Skill según traza) | NO | 14 AC, 0 [NEEDS CLARIFICATION], ningún AC con RECHAZAR automático y sección "Cambios tras aclaraciones" presente; cargó historia-gwt con Skill (sin Read de archivos de la skill). Falla: la primera línea dice "Agente: analista-requisitos" en vez de "Agente: analista". |

## 2. Decisiones humanas
| Punto | Fecha | Quién | Qué revisó | Decisión | Commit |
|---|---|---|---|---|---|
| H1 | 2026-11-19 | Nikolas Lagos (cliente) | Preguntas Q-1 a Q-5 de 02-especificacion.md | Respondió ACL-1 a ACL-5; ACL-2 y ACL-3 descartan el rechazo automático que pedía la necesidad (DEC-04) | a553993 |
| E1 | 2026-11-19 | Equipo | Encabezado de 02-especificacion.md | Corrigió a mano la primera línea a "Agente: analista" (salida del agente corregida por el equipo) | (commit pendiente) |
| H2 | 2026-11-19 | Nikolas Lagos (cliente) | 02-especificacion.md: 11 reglas, 14 AC, caso de uso, cuentas de cada AC y sección 7 | Aprueba. El vacío de la sección 7 (puntaje informado al derivar por FRAUDE o SIN_SENALES) queda fuera de alcance y no se prueba | (commit pendiente) |

## 3. Fallas y cambios
| ID | Corrida | Qué pasó | Categoría MAST | Causa (archivo y línea del agente o skill) | Cambio (commit) | Re-ejecución |
|---|---|---|---|---|---|---|
| F-1 | 1 | El analista omitió la línea de encabezado "Agente · Skills cargadas" que exige AGENTS.md | Especificación del sistema (FM-1.1, incumplir la especificación de la tarea) | La regla estaba solo en AGENTS.md y no en "# Entregables" de .claude/agents/analista.md | b8e7681 | Parcial en fila 2: aparece el encabezado, con nombre inventado (ver F-3) |
| F-2 | 1 | El analista no cargó historia-gwt como skill; la leyó como archivo con Read (la traza no muestra la herramienta Skill) | Especificación del sistema (FM-1.1) | El frontmatter tools de .claude/agents/analista.md (línea 4) no incluía Skill | b8e7681 | Resuelto en fila 2 |
| F-3 | 1 | El analista escribió "Agente: analista-requisitos" en el encabezado en vez de su nombre | Especificación del sistema (FM-1.2, incumplir la especificación del rol) | La viñeta de "# Entregables" en .claude/agents/analista.md (línea 31) decía "<tu nombre>" sin el nombre literal | (commit pendiente) | Corrida 2 |

## 4. Supuestos y excepciones
- Representante del cliente: Nikolas Lagos repite el rol de las entregas anteriores con autorización del profesor (excepción a la rotación del enunciado 4.5).
- ACL-4 (cliente sin umbrales configurados → error) es una decisión del cliente sin fuente en las entregas anteriores.
