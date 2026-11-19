# Bitácora del sistema multiagente · Entrega 4

Convenciones: una fila por invocación de agente o decisión humana. El prompt se copia literal. Las skills cargadas se toman de docs/evidencia/traza-herramientas.jsonl.

## 1. Registro de corridas
| # | Fecha y hora | Corrida | Etapa | Agente o persona | Prompt literal | Skills cargadas | ¿Cumplió su contrato? | Nota |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-19 19:21 | 1 (ensayo) | Especificar (1ra pasada) | analista | Primera pasada. Lee docs/trabajo/01-necesidad.md y produce docs/trabajo/02-especificacion.md según tus instrucciones. | ninguna según traza | SÍ | 10 AC en G/W/T y 5 preguntas Q-1..Q-5; leyó la skill historia-gwt con Read (sin herramienta Skill) y omitió la línea "Agente: ... · Skills cargadas: ..." que exige AGENTS.md. |
| 2 | 2026-11-19 19:38 | 1 (ensayo) | Especificar (2da pasada) | analista | Segunda pasada. Lee docs/trabajo/01-necesidad.md y docs/trabajo/03-aclaraciones.md y actualiza docs/trabajo/02-especificacion.md según tus instrucciones. | historia-gwt (herramienta Skill según traza) | NO | 14 AC, 0 [NEEDS CLARIFICATION], ningún AC con RECHAZAR automático y sección "Cambios tras aclaraciones" presente; cargó historia-gwt con Skill (sin Read de archivos de la skill). Falla: la primera línea dice "Agente: analista-requisitos" en vez de "Agente: analista". |
| 3 | 2026-11-19 19:44 | 1 (ensayo) | Planificar | planificador | La especificación docs/trabajo/02-especificacion.md está aprobada por el cliente. Produce docs/trabajo/04-plan.md según tus instrucciones. | ninguna según traza | SÍ | Encabezado correcto, 5 secciones, 7 tareas, sin dependencias nuevas; los 14 AC salen "En plan: SI" en el verificador. Solo escribió 04-plan.md (Read, Glob, Write). Observación: S-1 fija puntaje null en FRAUDE/SIN_SENALES (vacío que H2 dejó fuera de alcance) y S-4 elige 404; ambos declarados como supuestos sin prueba asociada, a confirmar al aprobar el plan. |

## 2. Decisiones humanas
| Punto | Fecha | Quién | Qué revisó | Decisión | Commit |
|---|---|---|---|---|---|
| H1 | 2026-11-19 | Nikolas Lagos (cliente) | Preguntas Q-1 a Q-5 de 02-especificacion.md | Respondió ACL-1 a ACL-5; ACL-2 y ACL-3 descartan el rechazo automático que pedía la necesidad (DEC-04) | a553993 |
| E1 | 2026-11-19 | Equipo | Encabezado de 02-especificacion.md | Corrigió a mano la primera línea a "Agente: analista" (salida del agente corregida por el equipo) | 66a5872 |
| H2 | 2026-11-19 | Nikolas Lagos (cliente) | 02-especificacion.md: 11 reglas, 14 AC, caso de uso, cuentas de cada AC y sección 7 | Aprueba. El vacío de la sección 7 (puntaje informado al derivar por FRAUDE o SIN_SENALES) queda fuera de alcance y no se prueba | 4a3a94c |
| H3 | 2026-11-19 | Equipo | 04-plan.md: diseño, contrato de la API, 7 tareas, matriz AC → prueba y supuestos S-1 a S-7 | Aprueba con una corrección: la prueba de AC-11 del plan verificaba la implementación (el enum) y no el criterio; se exige usar los datos del AC. Se aceptan S-1 (puntaje null en FRAUDE y SIN_SENALES, declarado y no probado) y S-4 (HTTP 404) | (commit pendiente) |
| E2 | 2026-11-19 | Equipo | Fila T-1 de 04-plan.md | Corrigió la definición de la prueba de AC-11 (salida del planificador corregida por el equipo) | (commit pendiente) |

## 3. Fallas y cambios
| ID | Corrida | Qué pasó | Categoría MAST | Causa (archivo y línea del agente o skill) | Cambio (commit) | Re-ejecución |
|---|---|---|---|---|---|---|
| F-1 | 1 | El analista omitió la línea de encabezado "Agente · Skills cargadas" que exige AGENTS.md | Especificación del sistema (FM-1.1, incumplir la especificación de la tarea) | La regla estaba solo en AGENTS.md y no en "# Entregables" de .claude/agents/analista.md | b8e7681 | Parcial en fila 2: aparece el encabezado, con nombre inventado (ver F-3) |
| F-2 | 1 | El analista no cargó historia-gwt como skill; la leyó como archivo con Read (la traza no muestra la herramienta Skill) | Especificación del sistema (FM-1.1) | El frontmatter tools de .claude/agents/analista.md (línea 4) no incluía Skill | b8e7681 | Resuelto en fila 2 |
| F-3 | 1 | El analista escribió "Agente: analista-requisitos" en el encabezado en vez de su nombre | Especificación del sistema (FM-1.2, incumplir la especificación del rol) | La viñeta de "# Entregables" en .claude/agents/analista.md (línea 31) decía "<tu nombre>" sin el nombre literal | 66a5872 | Corrida 2 |

## 4. Supuestos y excepciones
- Representante del cliente: Nikolas Lagos repite el rol de las entregas anteriores con autorización del profesor (excepción a la rotación del enunciado 4.5).
- ACL-4 (cliente sin umbrales configurados → error) es una decisión del cliente sin fuente en las entregas anteriores.
