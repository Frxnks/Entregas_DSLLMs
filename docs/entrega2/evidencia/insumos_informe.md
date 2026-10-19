# Insumos para el informe de Entrega 2

**Fecha de consolidación:** 2026-10-18
Este documento reúne datos de evidencia para el informe final; no redacta el informe ni convierte pruebas parciales en resultados aprobados.

## 1. Estado real del incremento

**Estado global: parcial.** F1 y F4 están implementadas. Hay pruebas automatizadas, evidencia de API y comprobaciones manuales de la interfaz, pero no se han demostrado todos los criterios de aceptación ni los requisitos no funcionales en una infraestructura productiva.

Durante la comprobación manual de la interfaz en Docker Compose el 2026-10-18 se abrió `CASO-SEED-002`, se revisaron sus señales y se confirmó una decisión humana (`APROBADO`), observándose el estado `RESUELTO`. También se cambió el umbral de 90 a 88, se observó la fila de auditoría con usuario y fecha, y se restauró a 90. Después se volvió a cargar el seed para restaurar los datos demo; las acciones borran el historial/auditoría generado durante esa prueba. Esa comprobación se hizo sobre la imagen Compose activa en ese momento y no se debe confundir con pruebas PostgreSQL automatizadas.

**Diferencia de revisión:** el código versionado en `main` al iniciar este trabajo (`ef03787`) persiste 74,0 para `CASO-SEED-002`. La imagen Compose usada en la comprobación manual anterior se había construido con cambios locales no integrados que persistían 74,3. Como el alcance actual es solo documentación/evidencia, no se mezclaron esos cambios de código. Las dos observaciones se mantienen separadas en vez de presentar la imagen probada como idéntica al código de `main`.

| Área | Estado según evidencia disponible | Límite |
|---|---|---|
| F1, visualización y revisión humana | Parcial. Tests de detalle/resolución y prueba de interfaz cubren partes del flujo. | Playwright intercepta llamadas de lease y decisión; no valida estas acciones contra una instancia real de PostgreSQL. |
| F1, coordenadas y leases | Parcial. Hay casos de prueba para ubicación y lease. | La prueba de interfaz no compara la geometría del rectángulo con el documento real; los tests de concurrencia usan mocks y no certifican carreras distribuidas. |
| F4, scoring y decisión | Parcial. La matriz automatizada incluye fórmula, umbrales, mínimos por señal y precedencia de fraude; la evidencia API documenta escenarios de evaluación. | El seed de este historial conserva una inconsistencia: 80×0,40 + 65×0,35 + 78×0,25 = **74,25**, pero `CASO-SEED-002` persiste **74,0**. La interfaz compacta muestra 74/100. No se corrigió el seed en esta fase. |
| F4, auditoría de umbral | Parcial. Los tests de servicio verifican versionamiento e historial con mocks. | No sustituyen una validación completa de persistencia, privilegios y auditoría en PostgreSQL desplegado. |
| Dato de RUT | Limitación observada: el seed guarda un RUT parcialmente enmascarado y el backend vuelve a enmascararlo. La evidencia de bandeja/API registró `***`. | La lógica no se modificó. Propuesta mínima, pendiente de decisión: |

```diff
 public enmascararRut(rut: string | null | undefined): string {
   if (!rut || typeof rut !== 'string') return '';
+  if (/^\d{1,2}(?:\.\d{3})+\.\*\*\*-\*$/.test(rut)) return rut;
   const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
```

La propuesta requiere una prueba unitaria para `enmascararRut('18.234.***-*')`. No se aplicó.

**Límite de Playwright:** la suite intercepta las operaciones de lease y resolución; no es una prueba end-to-end conectada a PostgreSQL real. Las pruebas backend que sustituyen Prisma por mocks tampoco demuestran persistencia en una base real. La verificación aislada con Docker Compose documentada aparte es evidencia de despliegue/arranque, no convierte las suites mockeadas en pruebas PostgreSQL.

La captura de bandeja de esa verificación mostró `CASO-SEED-002` disponible y `CASO-SEED-003` bloqueado por Carlos. En visitas posteriores al mismo Compose se registraron nuevas decisiones y cambios de umbral en los logs; por eso no se afirma que el contenido actual de la base siga en el estado restaurado, ni se volvió a ejecutar el seed para evitar borrar datos de otras pruebas.

**Reejecución de Fase G (2026-10-18):** backend unitario: 16 suites y 172 pruebas aprobadas; typecheck frontend: exit code 0; backend `test:e2e`: 3 suites y 41 pruebas aprobadas. Playwright en el Compose compartido obtuvo 2 aprobadas y 4 fallidas de 6; PX-08 midió 476 ms antes de fallar. En la inspección no destructiva de la bandeja, el API devolvió `CASO-SEED-003` bloqueado por Ana y no devolvió `CASO-SEED-002`. Las fallas relacionadas con presencia/navegación/resolución/discrepancias son dependientes de los casos de seed esperados. No se recargó el seed, ya que elimina decisiones y auditorías de la base compartida. Esto no es un fallo de typecheck. La ejecución histórica de 6/6 Playwright corresponde al clon aislado `mira-clean3` y no se presenta como resultado de esta reejecución.

## 2. Trazabilidad de requisitos Must de Entrega 1 en alcance

El universo es de **15 requisitos Must de Entrega 1** presentes en las matrices F1/F4: 9 RQF (`RQF-002`, `RQF-004`–`RQF-011`) y 6 RQNF (`RQNF-001`–`RQNF-006`). `RQF-015` no se cuenta porque en Entrega 1 era Should, aunque la matriz F4 de Entrega 2 lo elevó a Must. Las pruebas citadas son pruebas relacionadas; una relación en la tabla no afirma que el criterio de aceptación esté satisfecho completamente.

| Requisito E1 | Especificación | Tarea | Commit de implementación por fase | Prueba relacionada | Estado / ruptura |
|---|---|---|---|---|---|
| RQF-002 | F1, matriz RQF | F1 T009, T012 | `e84179d` (fase 3) | `case-detail.spec.ts` | Enlace presente; PF-02 solo parcial: no reproduce el expediente original de tres evidencias. |
| RQF-004 | F4, matriz RQF | F4 T005, T010–T014 | `6275887`, `e84179d` (fases 1–3) | `scoring-engine.spec.ts`, `scoring-quickstart.spec.ts` | Enlace presente; fixtures y discrepancia del seed limitan la comprobación de aceptación. |
| RQF-005 | F4, matriz RQF | F4 T005, T019–T022 | `6275887`, `24799d5` (fases 1–2 y 5) | `threshold-decision.spec.ts`, `quickstart-validation.spec.ts` | Enlace presente; no acredita contabilización en un sistema comercial real. |
| RQF-006 | F4, matriz RQF | F4 T023–T026 | `38f03b9` (fase 6) | `threshold-audit.spec.ts` | **Parcial:** PF-06 tiene test relacionado; PF-06b (rechazar publicación sin módulos activos) no tiene prueba identificada. |
| RQF-007 | F1/F4, matrices RQF | F1 T018–T019; F4 T015–T016, T021 | `181b860` (fase 4) | `fraud-precedence.spec.ts`, `resolution.spec.ts`, `threshold-decision.spec.ts` | Enlace presente; no todos los tests usan exactamente los 45 puntos de PF-07. |
| RQF-008 | F1/F4, matrices RQF | F1 T018; F4 T015–T018, T021 | `181b860` (fase 4) | `fraud-precedence.spec.ts`, `quickstart-validation.spec.ts`, `scoring-quickstart.spec.ts` | Enlace presente; cobertura parcial basada principalmente en servicios/fixtures. |
| RQF-009 | F1, matriz RQF | F1 T009–T015 | `e84179d` (fase 3) | `case-detail.spec.ts`, `review-flow.e2e.spec.ts` | Enlace presente; no valida toda la experiencia con PostgreSQL real. |
| RQF-010 | F1, matriz RQF | F1 T008, T016–T020 | `6275887`, `181b860` (fases 1–2 y 4) | `case-resolution.spec.ts`, `resolution.spec.ts`, `review-flow.e2e.spec.ts` | Enlace presente; persistencia durable y lectura posterior no quedan demostradas por Playwright. |
| RQF-011 | F1, matriz RQF | F1 T016–T020 | `181b860` (fase 4) | `case-resolution.spec.ts`, `resolution.spec.ts`, `review-flow.e2e.spec.ts` | Enlace presente; la UI de Playwright intercepta la respuesta de resolución. |
| RQNF-001 | F1/F4, matrices RQNF | F1 T001, T004–T005; F4 T001–T002, T007–T008, T027 | `6275887`, `450e2ff` (fases 1–2 y 7) | `extra-functional.e2e-spec.ts`, `extra-functional-f1.e2e-spec.ts`, `sla-concurrency.spec.ts` | Enlace presente; no acredita p95 bajo carga integrada y persistente. |
| RQNF-002 | F4, matriz RQNF | F4 T027 | `450e2ff` (fase 7) | `extra-functional.e2e-spec.ts` | **Cadena de aceptación rota:** no se demuestra procesamiento asíncrono end-to-end de evidencia pesada. |
| RQNF-003 | F1/F4, matrices RQNF | F1 T008b, T027b; F4 T027 | `6275887`, `450e2ff` (fases 1–2 y 7) | `pii-masking.spec.ts`, `extra-functional.e2e-spec.ts`, `extra-functional-f1.e2e-spec.ts` | Enlace presente; los tests no demuestran residencia territorial ni ausencia de egreso en infraestructura real. |
| RQNF-004 | F1, matriz RQNF | F1 T027b | `450e2ff` (fase 7) | `extra-functional-f1.e2e-spec.ts` | **Cadena de aceptación rota:** se prueba hash/metadatos, no cifrado ni retención 90 días/5 años. |
| RQNF-005 | F1/F4, matrices RQNF | F1 T008, T016, T027; F4 T005, T023–T026 | `6275887`, `181b860`, `450e2ff` | `audit-immutability.e2e-spec.ts`, `threshold-audit.spec.ts` | Enlace presente; middleware/mocks no prueban integridad durable con privilegios de DB real. |
| RQNF-006 | F1/F4, matrices RQNF | F1 T027b; F4 T027 | `450e2ff` (fase 7) | `extra-functional.e2e-spec.ts`, `extra-functional-f1.e2e-spec.ts` | **Cadena de aceptación rota:** las fallas simuladas no certifican 99,9 % mensual ni recuperación de infraestructura. |

Las tareas de SDD se agruparon en commits de avance por fase, no en un commit por requisito. Por ello el enlace a commit es por fase de implementación, no una atribución uno-a-uno de cada tarea. Las brechas anteriores corresponden a evidencia de aceptación faltante; no se ocultan porque exista un test de nombre relacionado.

**Indicador de trazabilidad documental:** 15/15 = **100 %** de requisitos con referencias identificables a especificación, tarea, commit por fase y prueba relacionada. Esta medida es de existencia de enlaces documentales, no porcentaje de criterios de aceptación aprobados. Las cadenas de aceptación que quedan rotas o parciales se marcan en la tabla.

## 3. Clasificación de cambios para la tabla 6.6.1

Para la estabilidad, el denominador son los **18 requisitos E1** incluidos en las matrices de F1/F4: 10 RQF (`RQF-002`, `RQF-004`–`RQF-011`, `RQF-015`) y 8 RQNF.

| Categoría | Conteo | Requisitos y motivo |
|---|---:|---|
| Sin cambio | 14 | RQF-002, RQF-004, RQF-005, RQF-009, RQF-010, RQF-011 y RQNF-001–RQNF-008 conservan su intención. El hecho de no cambiar el requisito no implica que esté completamente probado. |
| Modificado | 4 | RQF-006 se amplía a mínimos por señal; RQF-007 y RQF-008 precisan las salvaguardas y causales; RQF-015 cambia de Should en E1 a Must en F4. |
| Nuevo | 5 | RQF-020 ubicación de hallazgos, RQF-021 SLA hábil y escalamiento, RQF-022 mínimos por señal, RQF-023 precedencia de fraude, RQF-024 bandeja y concurrencia híbrida. |
| Descartado | 1 | RQF-018, migración de casos de pilotos anteriores, ya estaba clasificado Won't en E1. No pertenece al universo de alcance F1/F4. |
| Diferido | 7 | RQF-001, RQF-003, RQF-012, RQF-013, RQF-014, RQF-016 y RQF-017 quedan fuera de F1/F4. RQF-014 tiene soporte estructural, pero la interfaz de supresión se difiere; RQF-013 se mantiene como precondición de SSO, no como función implementada aquí. |

**Indicador de estabilidad:** requisitos sin cambio / requisitos E1 en alcance = **14/18 = 77,78 %**. Al lado: 4 modificados, 5 nuevos y 1 descartado; el descartado y los siete diferidos se indican aparte porque están fuera del denominador de alcance F1/F4.

## 4. Supuestos de Entrega 1 invalidados y quién los detectó

Resumen de [supuestos_invalidados.md](../supuestos_invalidados.md):

| Supuesto invalidado | Quién lo detectó según el registro | Resolución de diseño en E2 |
|---|---|---|
| Umbral inferior `valorRevision` y posibilidad implícita de rechazo automático. | Equipo de Ingeniería y Representante del Cliente. | Se elimina el umbral inferior y se mantiene control humano por DEC-04; se agrega mínimo por señal. |
| SLA entendido como reloj continuo 24/7. | Representante del Cliente, en clarificación. | Se computa en horario hábil chileno y se escala al vencer. |
| Bandeja monousuario sin colisiones. | El agente identificó el riesgo; el Representante del Cliente reformuló la solución. | Lectura concurrente, lease temporal y resolución atómica. |
| Evidencia como archivo aislado sin ubicación del hallazgo. | Equipo de Ingeniería. | Relación señal-evidencia y ubicación espacial. |
| Sugerencia MIRA implícita/no persistida. | Agente. | Persistencia explícita para auditoría y discrepancias. |
| Proceso monolítico síncrono F4/F1. | Equipo de Ingeniería y Agente. | Separación productor-consumidor. |
| Inalterabilidad solo declarativa. | Equipo de Ingeniería. | Persistencia append-only y auditoría de umbrales. |

## 5. Decisiones del agente no declaradas y decisiones explícitas DEC-15/DEC-16

Los cinco supuestos del agente ya analizados en [especificacion_cambios.md](../especificacion_cambios.md):

| Elemento | Estado consignado |
|---|---|
| Umbral visual de alerta `<24 h` y colores ámbar/rojo. | Añadido por el agente; aceptado por el equipo como regla medible. |
| Reloj SLA continuo 24/7. | Supuesto inicial del agente; rechazado y corregido tras clarificación. |
| Bloqueo monousuario estricto. | Propuesta inicial del agente; rechazada y reformulada a concurrencia híbrida por el cliente. |
| Nombres técnicos de enumerados/estados. | Añadidos por el agente; aceptados para tipar el modelo. |
| Mínimo basal 60 puntos. | Propuesto por el agente y aceptado por el cliente para señales documentales del MVP. |

Decisiones expresas del representante en [decisiones_entrega2.md](../decisiones_entrega2.md):

- **DEC-15 — Aceptada, 2026-10-18:** MIRA puede sugerir APROBAR bajo el umbral y sin fraude; la decisión sigue siendo humana y DEC-04 se mantiene. No implica aprobación automática.
- **DEC-16 — Registrada, 2026-10-18:** el mismo integrante repite como representante en Entrega 2 contra la regla de rotación. Riesgo: sesgo de aceptación. Mitigación: la sesión de aceptación la firma el equipo con la lista de criterios de Entrega 1, no solo el representante.

DEC-15 y DEC-16 son decisiones del cliente, no decisiones autónomas del agente. La revisión de IDs en Entrega 1, specs y documentos de Entrega 2 no encontró colisiones.

## 6. Indicadores para la sección 6.6

Los tres indicadores son **supuesto del equipo, definición no confirmada por el enunciado**.

| Indicador | Fórmula | Valor |
|---|---|---|
| Cobertura de trazabilidad | Requisitos Must E1 en alcance con cadena documental completa / requisitos Must E1 en alcance | 15/15 = **100 %** de enlaces documentales. La limitación de aceptación se aclara en §2. |
| Estabilidad de requisitos | Requisitos sin cambio / requisitos E1 en alcance | 14/18 = **77,78 %**; al lado: 4 modificados, 5 nuevos y 1 descartado (fuera del alcance). |
| Proporción de autoría | Líneas escritas por agente / líneas totales; complemento del equipo / total | Según [autoria.md](./autoria.md): agente 42.802/43.029 = **99,47 %**; equipo 227/43.029 = **0,53 %**. |

La autoría toma `autoria.md` como fuente y mide cambios de líneas por commits alcanzables desde `e845bb0`, no el tamaño final de los archivos. La autoría de las dos líneas de `46a31b1` ya está clasificada como **equipo** por confirmación explícita del usuario; no queda margen pendiente por esas líneas en esta fuente.

## 7. Comparación de backlogs Entrega 1 vs Entrega 2

| Elemento | Entrega 1 | Entrega 2 | Cambió por qué |
|---|---|---|---|
| Requisitos funcionales | 18 RQF (`RQF-001`–`RQF-018`) con prioridades Must/Should/Could/Won't. | F1 y F4 en alcance; diez RQF E1 en sus matrices y cinco nuevos RQF-020–RQF-024. | El incremento enfoca el MVP médico y agrega ubicación espacial, SLA, mínimos por señal, precedencia de fraude y concurrencia. |
| Requisitos no funcionales | Ocho RQNF (`RQNF-001`–`RQNF-008`). | Los ocho se referencian en F1/F4; seis aparecen como Must y dos Should en sus matrices. | Se conservan como restricciones; la evidencia no acredita todos los umbrales de aceptación. |
| Funcionalidades | Backlog amplio del producto: ingesta, conectores, revisión y utilidades. | F1 bandeja asistida y F4 scoring/umbrales. | Se prioriza el MVP médico; SSO, conectores, exportación y webhooks quedan fuera de este incremento. |
| Historias y tareas | 13 historias de usuario documentadas en E1. | 61 tareas SDD: 31 F1 y 30 F4. | La descomposición técnica no es directamente comparable al conteo de historias; incorpora dependencias y pruebas. |
| Decisiones | Fuentes E1 contienen DEC-01–DEC-11; el README E1 enumera DEC-01–DEC-10. | Clarificación DEC-01–DEC-14 y registro adicional DEC-15/DEC-16. | Se resolvieron ambigüedades operativas y se registraron decisiones del representante. |
| Requisitos descartados/diferidos | RQF-018 ya está en Won't; varios requisitos pertenecen al producto general. | RQF-018 se mantiene descartado; RQF-001, 003, 012, 013, 014, 016 y 017 se difieren/fuera de F1/F4. | El incremento no pretende completar todos los módulos del producto. |
| Evidencia de aceptación | PF/PX establecen criterios originales. | Pruebas automatizadas, revisión API y comprobaciones de demo; algunas son parciales, mockeadas o no reproducen la infraestructura real. | Se separa la trazabilidad documental de los criterios realmente demostrados. |
