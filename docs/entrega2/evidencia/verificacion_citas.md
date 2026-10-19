# Verificación de citas, identificadores y rutas

**Fecha de revisión:** 18-10-2026
**Alcance:** 14 documentos fuente revisados: `README.md`, `docs/*.md`, los documentos de Entrega 2 existentes al iniciar la auditoría y `specs/*/spec.md`. Este propio informe se excluye de los conteos para evitar autocita.
**Método:** inventario de referencias DEC/RQF/RQNF/PF/PX, comprobación de rutas locales Markdown y rutas de archivo citadas en código, y consulta del objeto Git para cada SHA de commit citado. Los identificadores repetidos se agrupan por archivo en la tabla; el campo “Dónde” identifica el artefacto y las secciones en las que aparecen.

## Inventario de identificadores citados

Los identificadores de cada fila son los valores distintos encontrados en ese archivo; se comprobaron todas sus apariciones.

| Dónde aparece | DEC | RQF | RQNF | PF | PX | ¿Existe? / observación |
|---|---|---|---|---|---|---|
| [README.md](../../../README.md), enlaces de documentación y prueba | — | — | — | — | — | Sí. Las rutas del manual, guía de scoring y quickstart resuelven a los archivos existentes. |
| [review-tray-operator-guide.md](../../review-tray-operator-guide.md), principios, SLA, detalle y FAQ | 04–06, 11 | 002, 003, 006–011, 020, 023 | 003, 005, 008 | — | 06, 08 | Sí. La sección SLA y la nota de máscara se ajustaron a lo verificado. |
| [scoring-api-guide.md](../../scoring-api-guide.md), reglas, DTOs y principios | 01, 04–06, 11 | 004, 007, 015, 022, 023 | 001, 003, 005, 006, 008 | — | 01, 05, 06 | Sí. El ejemplo de `CASO-SEED-002` coincide con las señales del seed; se conserva explícita la diferencia entre suma 74,25 y valor persistido 74,0. |
| [README.md de Entrega 2](../README.md), síntesis, matrices y estado | 01–14 | 001–018, 020–024 | 001, 008 | — | — | Sí como IDs referenciados. Los conteos y rangos de decisión se matizaron para distinguir fuentes y prioridad Must/Should. |
| [analisis_cruzado_especificaciones.md](../analisis_cruzado_especificaciones.md), hallazgos, matrices y conclusiones | 01, 04–06, 11, 13 | 002–011, 013–015, 020–024 | 001–008 | 02, 07, 15 | 01–04, 06, 08 | Sí. Las rutas Linux originales se reemplazaron por enlaces relativos; las afirmaciones de cobertura del análisis se entienden como resultados de ese análisis, no como cobertura de pruebas de aceptación. |
| [cambios_diagramas_persistencia.md](../cambios_diagramas_persistencia.md), modelos y decisiones de persistencia | 01, 03–06, 09, 11, 13, 14 | 002, 004, 006, 009, 011, 015, 020–024 | 003–005, 008 | — | 03, 05 | Sí. Sus enlaces a plan, modelo de datos y specs resuelven a los archivos del repo. |
| [clarificacion_cambios.md](../clarificacion_cambios.md), preguntas y matriz DEC-01 a DEC-14 | 01–14 | 020–024 | — | 21, 24 | — | Sí en la matriz de clarificación. `DEC-13` y `DEC-14` aparecen en este documento, pero no en la Constitución actual. |
| [especificacion_cambios.md](../especificacion_cambios.md), matriz comparativa y cambios | 01, 04–11 | 001–018, 020–024 | 001, 003, 006, 008 | 02, 04–11, 15, 20–24 (incluye 06b) | — | Sí. Las cifras históricas de líneas se corrigieron con `git show --numstat`; la atribución porcentual quedó pendiente de la Fase 6. |
| [matriz_pruebas.md](./matriz_pruebas.md), trazabilidad de pruebas y brechas | — | 002, 004–011, 015, 020–024 | 001–008 | 02, 04–11, 15, 20–24 (incluye 06b) | 01–08 | Sí. La matriz distingue la cobertura de reglas con mocks de los criterios de aceptación e integración no probados. |
| [verificacion_clon_limpio.md](./verificacion_clon_limpio.md), resultado del clon aislado | — | — | — | — | — | Sí. El SHA de commit registrado se verifica en Git; el tiempo reportado corresponde a la ejecución con caché Docker local. |
| [verificacion_F4.md](./verificacion_F4.md), requests, respuestas y veredictos | 04 | 022, 023 | — | — | — | Sí. El SHA de clon está presente en Git; la desviación seed sigue señalada como no resuelta. |
| [supuestos_invalidados.md](../supuestos_invalidados.md), supuestos, evidencia y decisiones | 04, 05, 07, 11, 13, 14 | 011, 020–022, 024 | 001, 004, 005 | 24 | 05 | Sí. Sus rutas a Constitución, plan, modelo y clarificación existen. |
| [spec.md de F1](../../../specs/001-bandeja-revision-asistida/spec.md), escenarios, matrices y contratos | 03–07, 10 | 002, 003, 007–011, 013, 020, 021, 024 | 001, 003–006, 008 | 02, 07–11, 20, 21, 24 | 01, 03–06, 08 | Sí. Los requisitos y casos citados aparecen en el propio artefacto o en las fuentes identificadas. |
| [spec.md de F4](../../../specs/002-puntaje-decision-umbrales/spec.md), escenarios, matrices y criterios | 01, 02, 04–07, 10, 11 | 002, 004–008, 015, 022, 023 | 001–003, 005–008 | 04–08, 15, 22, 23 (incluye 06b) | 01–03, 05–08 | Sí. Los requisitos/casos aparecen en las matrices de F4. `RQF-015` está clasificado Must en F4, aunque era Should en Entrega 1. |

## Commits y referencias de tipo hash

| SHA citado | Dónde aparece | ¿Es un commit existente? | Correspondencia verificada |
|---|---|---|---|
| `184d9a3` | [especificacion_cambios.md](../especificacion_cambios.md) | Sí | Introduce las dos specs iniciales; `git show --numstat` registra 154 y 163 líneas añadidas, respectivamente. |
| `8310291` | [especificacion_cambios.md](../especificacion_cambios.md) | Sí | Clarifica las specs; `git show --numstat` registra F1 `+19/-9` y F4 `+15/-6`. Los contenidos resultantes tienen 164 y 172 líneas. |
| `459522e` | [matriz_pruebas.md](./matriz_pruebas.md) | Sí | Es el HEAD anterior a crear la matriz de pruebas. |
| `a89ae03` | [verificacion_clon_limpio.md](./verificacion_clon_limpio.md) y [verificacion_F4.md](./verificacion_F4.md) | Sí | Corresponde al HEAD del clon limpio medido que se identifica en ambas evidencias. |

Los valores UUID de ejemplo de las respuestas JSON —por ejemplo, `f47ac10b-58cc-4372-a567-0e02b2c3d479`— son datos ilustrativos de contrato, no SHA de commit ni afirmaciones de que exista una fila con ese UUID en la base.

## Rutas y nombres de archivo

| Referencia revisada | Dónde aparece | ¿Existe? | Observación |
|---|---|---|---|
| Enlaces locales Markdown | Los 14 documentos fuente | Sí: 59 de 59 enlaces locales comprobados | Se decodificaron escapes URL como `%20` antes de comprobar cada ruta. |
| Rutas de archivo en código Markdown | Los 14 documentos fuente | Sí: 23 de 23 rutas comprobadas | Las rutas explícitas a `README.md`, `docs/`, `specs/`, `backend/`, `frontend/` y `.specify/` existen. |
| `file:///home/franko/Codigos/Entregas_DSLLMs/...` | Cinco documentos de `docs/entrega2/` | No eran portables; corregidas | Se reemplazaron 26 destinos por rutas relativas en el commit `[IA] Corregir enlaces locales de Entrega 2`. Ya no quedan URLs con ese prefijo en el alcance. |
| Guía de API del README raíz | [README.md](../../../README.md) | Sí | El nombre real es `docs/scoring-api-guide.md`; el enlace usa ese nombre. `docs/score-api-guide.md` no existe, pero tampoco es el nombre enlazado. |
| Índice de Entrega 2 | [README.md de Entrega 2](../README.md) | Sí | Los cinco artefactos enlazados (`especificacion_cambios.md`, `clarificacion_cambios.md`, `cambios_diagramas_persistencia.md`, `supuestos_invalidados.md` y `analisis_cruzado_especificaciones.md`) existen con esos nombres. |
| Contrato `specs/002-puntaje-decision-umbrales/contracts/scoring-api.json` | [analisis_cruzado_especificaciones.md](../analisis_cruzado_especificaciones.md) | Sí | El archivo existe en esa ruta. |
| Quickstarts, planes, tareas, modelos de datos y Constitución enlazados desde E2 | `docs/entrega2/*.md` | Sí | Los destinos revisados existen con los nombres documentados. |

## Inconsistencias de contenido que requieren mantener la distinción de fuentes

| Referencia / afirmación | Dónde aparece | ¿Corresponde? | Observación / estado |
|---|---|---|---|
| Conteo de decisiones de Entrega 1 | [README de Entrega 1](../../entrega1/README.md), [prueba.md](../../entrega1/prueba.md), Constitución y matriz de clarificación | Anexo E1: `DEC-01` a `DEC-12` | Las fichas del cuerpo y el README de E1 usan numeración desplazada; para las citas se toma el rango del anexo. La Constitución referencia `DEC-01`–`DEC-12` y clarificación cataloga `DEC-01`–`DEC-14`. Se documenta aquí la distinción sin editar Entrega 1. |
| Correspondencia entre DEC y su descripción en E1 | `docs/entrega1/README.md` y `docs/entrega1/prueba.md` | Requiere revisión del equipo | `prueba.md` reconoce expresamente en su análisis retrospectivo el corrimiento entre etiquetas DEC y contenidos de la bitácora. No se corrigió ni reescribió Entrega 1. |
| `RQF-015` | Entrega 1 y tabla F4 | Diferencia de prioridad | La tabla E1 clasifica `RQF-015` como Should; la tabla F4 E2 lo clasifica Must. La diferencia se conserva y se señala, sin cambiar el requisito. |
| `RQF-013` | README E2 y spec F1 | Referencia como precondición, no como fila de requisito | La spec menciona SSO como precondición, pero no contiene una fila RQF-013 en su tabla de requisitos Must/Should. Se corrigió la afirmación de “integrado formalmente” en el resumen E2. |
| Conteos de F1/F4 | README E2 y tablas de ambas specs | Corresponde con la definición por fuente | E1 define 18 RQF y 8 RQNF; F1/F4 contienen 15 IDs RQF únicos (10 legados y 5 nuevos) y 8 IDs RQNF únicos. En estos últimos, 6 son Must y 2 Should. La presencia de un ID en una spec no garantiza que tenga un test automatizado de aceptación. |
| Cobertura y trazabilidad de pruebas | [README E2](../README.md) y [matriz_pruebas.md](./matriz_pruebas.md) | Parcial si se interpreta como cobertura automatizada | La matriz identifica brechas, entre ellas PF-06b sin prueba automatizada identificada y requisitos cuya cobertura usa mocks o no acredita infraestructura real. El estado E2 actualizado no declara cobertura normativa del 100%. |
| Máscara RUT | [review-tray-operator-guide.md](../../review-tray-operator-guide.md), seed, servicio y UI local | No coincide el formato observado con el formato esperado | La UI y la API mostraron `***` para CASO-SEED-002/003 porque el seed guarda el valor ya enmascarado y el servicio lo enmascara otra vez. Se documentó el hallazgo; no se cambió lógica ni seed, pendiente decisión del equipo. |
| SLA en la guía operativa | [review-tray-operator-guide.md](../../review-tray-operator-guide.md) y utilidad de calendario | Corregida | La guía decía 72 horas hábiles; ahora indica 3 días de 10 horas laborables (30 horas hábiles), excluyendo periodos no laborables. |
| Ejemplo `CASO-SEED-002` en API scoring | [scoring-api-guide.md](../../scoring-api-guide.md) y [seed.ts](../../../backend/prisma/seed.ts) | Corregido con diferencia explícita | Se sustituyeron los datos inventados del ejemplo por 80/65/78 con pesos 0,40/0,35/0,25. La suma es 74,25, pero el seed persiste 74,0; la causa permanece pendiente, sin suponer redondeo. |
| Métricas de líneas | [especificacion_cambios.md](../especificacion_cambios.md) | Corregidas | Los conteos y el total ahora corresponden a los commits citados. Los porcentajes se posponen a la Fase 6, porque numstat no determina autoría. |
| Siguiente paso de implementación | [README E2](../README.md) | Corregido | Se eliminó `/speckit-implement` como próximo paso; el README indica que la implementación existe y remite a la evidencia de pruebas y brechas. |

No se editó ningún archivo bajo `docs/entrega1/`. Las decisiones de negocio, las discrepancias del seed y la máscara observada se dejan sin cambios de lógica; cualquier corrección funcional requiere decisión del equipo.
