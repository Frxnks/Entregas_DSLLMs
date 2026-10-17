# Tasks: F1 - Bandeja de revisión asistida

**Rama de Funcionalidad**: `001-bandeja-revision-asistida`  
**Especificación**: [spec.md](file:///home/franko/Codigos/Entregas_DSLLMs/specs/001-bandeja-revision-asistida/spec.md)  
**Plan de Implementación**: [plan.md](file:///home/franko/Codigos/Entregas_DSLLMs/specs/001-bandeja-revision-asistida/plan.md)  
**Modelo de Datos**: [data-model.md](file:///home/franko/Codigos/Entregas_DSLLMs/specs/001-bandeja-revision-asistida/data-model.md)  
**Contratos**: [review-tray-api.json](file:///home/franko/Codigos/Entregas_DSLLMs/specs/001-bandeja-revision-asistida/contracts/review-tray-api.json)  

---

## Phase 1: Setup (Shared Infrastructure)

**Propósito**: Inicialización de la infraestructura técnica del entorno orquestado Docker, configuración de Next.js 14 y librerías cliente.

- [ ] T001 Configurar orquestación de servicios en `docker-compose.yml` para base de datos PostgreSQL, backend NestJS y frontend Next.js 14 [RQNF-001, RQNF-008]
- [ ] T002 Inicializar aplicación frontend Next.js 14 con TypeScript, Tailwind CSS y componentes de shadcn/ui en `frontend/package.json` y `frontend/tailwind.config.js` [RQNF-008]
- [ ] T003 [P] Configurar layout global con soporte 100% en idioma español y navegación en `frontend/src/app/layout.tsx` [RQNF-008]
- [ ] T004 [P] Implementar cliente HTTP tipado para consumo de la API REST del backend en `frontend/src/lib/api-client.ts` [RQNF-001, RQNF-008]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Propósito**: Servicios centrales de control de concurrencia híbrida, utilitarios de calendario chileno y modelos de DTO que sustentan la bandeja.

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta completar esta fase.

- [ ] T005 Configurar módulo `ReviewTrayModule` y estructura de servicios en `backend/src/review-tray/review-tray.module.ts` e integrarlo en `backend/src/app.module.ts` [RQNF-001]
- [ ] T006 [P] Implementar utilitario de calendario hábil de Chile (lunes a viernes 08:30 a 18:30 hrs, feriados oficiales) en `backend/src/common/utils/chilean-calendar.util.ts` [RQF-021]
- [ ] T007 [P] Implementar servicio de control de concurrencia y arriendo temporal (lease de 15 min renovable con heartbeat) en `backend/src/review-tray/concurrency.service.ts` [RQF-024]
- [ ] T008 [P] Implementar servicio de persistencia inalterable append-only para registro de decisiones en `backend/src/review-tray/resolution.service.ts` [RQF-010, RQNF-005]
- [ ] T008b [P] Implementar servicio y utilitarios de enmascaramiento de PII (RUTs y nombres chilenos) para DTOs salientes y sanitización de logs en `backend/src/common/services/pii-masking.service.ts` [RQNF-003, DEC-06]
- [ ] T009 Implementar DTOs para consultas de lista, detalle, leases y resolución en `backend/src/review-tray/dto/case-summary.dto.ts` y `backend/src/review-tray/dto/case-detail.dto.ts` [RQF-009, RQF-010, RQF-020, RQF-024]

**Checkpoint**: Infraestructura base de concurrencia y cómputo de SLA operativa. Las historias de usuario de la bandeja asistida pueden comenzar en paralelo.

---

## Phase 3: User Story 1 - Visualización Integral del Caso Derivado y Localización de Hallazgos (Priority: P1) 🎯 MVP

**Goal**: Presentar al operador liquidador, en una única pantalla y sin transiciones externas: evidencia, puntaje global, desglose de señales, razón explícita de derivación y visor interactivo con ubicación espacial de los hallazgos (`bounding boxes`).

**Independent Test**: Cargar `/bandeja/CASO-SEED-002` y verificar que el visor interactivo resalta visualmente las coordenadas del hallazgo de desfase de fecha sobre el comprobante mock en menos de 2 segundos.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estas pruebas primero y verificar que fallen antes de implementar**

- [ ] T010 [P] [US1] Pruebas unitarias y de integración para endpoint de detalle de caso con hallazgos espaciales en `backend/test/case-detail.spec.ts` [RQF-009, RQF-020, RQNF-008]

### Implementation for User Story 1

- [ ] T011 [P] [US1] Implementar endpoint `GET /api/v1/review-tray/cases/:idCaso` con mapeo de evidencias, señales y coordenadas en `backend/src/review-tray/review-tray.controller.ts` [RQF-009, RQF-020]
- [ ] T012 [US1] Implementar consulta de detalle y armado de `CaseDetailDto` con manejo de excepciones de legibilidad en `backend/src/review-tray/review-tray.service.ts` [RQF-002, RQF-009, RQF-020]
- [ ] T013 [P] [US1] Desarrollar componente de visor de evidencias con soporte de PDF/imágenes y resaltado espacial de hallazgos en `frontend/src/components/VisorEvidencia.tsx` [RQF-020, RQNF-008]
- [ ] T014 [P] [US1] Desarrollar componente de desglose de señales y razón explícita de derivación en `frontend/src/components/DesgloseSenales.tsx` [RQF-009, RQNF-008]
- [ ] T015 [US1] Construir página de detalle y visor consolidado del caso derivado en `frontend/src/app/bandeja/[idCaso]/page.tsx` [RQF-009, RQF-020, RQNF-008]

**Checkpoint**: User Story 1 completamente operativa. El operador puede inspeccionar cualquier caso derivado y ubicar espacialmente los hallazgos en la evidencia.

---

## Phase 4: User Story 2 - Resolución del Caso por el Operador y Trazabilidad de Discrepancias (Priority: P1)

**Goal**: Registrar la decisión formal del operador (Aprobar, Rechazar, Solicitar Antecedentes) exigiendo motivo obligatorio, persistiendo un registro inalterable (append-only) y detectando discrepancias con la sugerencia de MIRA (`marcaDiscrepancia = true`).

**Independent Test**: Resolver `CASO-SEED-003` (sugerencia MIRA `RECHAZAR`) emitiendo `APROBAR` con justificación en `backend/test/case-resolution.spec.ts`, validando que se fija `marcaDiscrepancia = true` y el caso pasa a `RESUELTO`.

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Pruebas de integración para persistencia inalterable de decisión y marcado automático de discrepancia en `backend/test/case-resolution.spec.ts` [RQF-010, RQF-011, RQNF-005]

### Implementation for User Story 2

- [ ] T017 [P] [US2] Implementar endpoints `POST /api/v1/review-tray/cases/:idCaso/decision` y `GET /api/v1/review-tray/discrepancies` en `backend/src/review-tray/review-tray.controller.ts` [RQF-010, RQF-011, RQNF-005]
- [ ] T018 [US2] Implementar validación de motivo obligatorio, inserción inalterable, salvaguarda de control humano (no rechazo automático) y detección de discrepancia en `backend/src/review-tray/resolution.service.ts` [RQF-007, RQF-010, RQF-011, RQNF-005]
- [ ] T019 [P] [US2] Desarrollar panel de acciones resolutivas con justificación obligatoria, control de veredicto humano y confirmación atómica en `frontend/src/components/PanelResolucion.tsx` [RQF-007, RQF-010, RQNF-005, RQNF-008]
- [ ] T020 [US2] Integrar emisión de resolución y notificación de discrepancia en la pantalla de detalle en `frontend/src/app/bandeja/[idCaso]/page.tsx` [RQF-010, RQF-011, RQNF-008]

**Checkpoint**: User Stories 1 y 2 operativas de forma conjunta e independiente.

---

## Phase 5: User Story 3 - Lista de Casos Derivados, Tiempo Restante y Alertas de Vencimiento de SLA (Priority: P2)

**Goal**: Proveer una lista de trabajo priorizada en la bandeja de revisión asistida que presente los casos derivados, tiempo restante decreciente en días y horas hábiles de Chile, alertas visuales (<24h ámbar/rojo), transición automática a `Vencido_Escalado` y gestión de arriendos temporales (leases de 15 min).

**Independent Test**: Acceder a `/bandeja`, comprobar el ordenamiento por prioridad y SLA hábil, y verificar que la adquisición de arriendo bloquea la edición concurrente vía `POST /api/v1/review-tray/cases/:idCaso/lease` en `backend/test/sla-concurrency.spec.ts`.

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Pruebas unitarias para cómputo de SLA hábil chileno y control de leases de 15 min en `backend/test/sla-concurrency.spec.ts` [RQF-021, RQF-024]

### Implementation for User Story 3

- [ ] T022 [P] [US3] Implementar endpoints `GET /api/v1/review-tray/cases` y `POST /api/v1/review-tray/cases/:idCaso/lease` en `backend/src/review-tray/review-tray.controller.ts` [RQF-021, RQF-024]
- [ ] T023 [US3] Implementar consulta de casos derivados con cálculo dinámico de horas hábiles restantes y estado de lease en `backend/src/review-tray/review-tray.service.ts` [RQF-021, RQF-024]
- [ ] T024 [P] [US3] Desarrollar componente de indicador de SLA y semáforo visual (verde/ámbar/rojo) en `frontend/src/components/BadgeSLA.tsx` [RQF-021, RQNF-008]
- [ ] T025 [US3] Construir interfaz principal de la bandeja de trabajo con tabla priorizada y filtros en `frontend/src/app/bandeja/page.tsx` [RQF-008, RQF-021, RQF-024, RQNF-008]

**Checkpoint**: Todas las historias de usuario de la especificación F1 se encuentran implementadas y probadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Propósito**: Verificación de experiencia de usuario de extremo a extremo, aseguramiento de tiempos de respuesta < 2s e inalterabilidad de auditoría.

- [ ] T026 [P] Implementar pruebas End-to-End con Playwright para flujo completo de revisión, usabilidad y tiempo de carga < 2s (PX-08) en `frontend/tests/review-flow.e2e.spec.ts` [RQNF-008, PX-08]
- [ ] T027 [P] Implementar prueba de inalterabilidad append-only y rechazo de modificaciones directas en auditoría (PX-05) en `backend/test/audit-immutability.e2e-spec.ts` [RQNF-005, PX-05]
- [ ] T027b [P] Implementar pruebas de verificación extra-funcional para soberanía local y enmascaramiento de PII (PX-03), retención de evidencia cifrada (PX-04) y tolerancia a caídas de servicios externos (PX-06) en `backend/test/extra-functional-f1.e2e-spec.ts` [RQNF-003, RQNF-004, RQNF-006, PX-03, PX-04, PX-06]
- [ ] T028 [P] Ejecutar validación completa de la guía de inicio rápido en `specs/001-bandeja-revision-asistida/quickstart.md` [RQF-008, RQF-009, RQF-010, RQF-011, RQF-020, RQF-021, RQF-024]
- [ ] T029 Documentar manual operativo de la bandeja de revisión asistida en `docs/review-tray-operator-guide.md` [RQNF-008]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas; inicio inmediato.
- **Foundational (Phase 2)**: Depende de Setup (Phase 1) y de la persistencia base de F4 (tareas T005 a T009 de `002-puntaje-decision-umbrales` para inicialización de `schema.prisma`, migraciones PostgreSQL y seeds precalculadas). Bloquea la implementación de historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2). Puede ejecutarse en paralelo con US2 y US3.
- **User Story 2 (Phase 4)**: Depende de US1 (Phase 3) para la UI de detalle y de Foundational para `resolution.service.ts`.
- **User Story 3 (Phase 5)**: Depende de Foundational (Phase 2) para el calendario chileno y `concurrency.service.ts`.
- **Polish (Phase 6)**: Depende de la finalización de todas las historias de usuario.

### User Story Dependencies

- **US1 (P1)**: Núcleo de visualización de evidencias y hallazgos localizados.
- **US2 (P1)**: Extiende la pantalla de US1 incorporando el panel resolutivo y la captura inmutable del veredicto.
- **US3 (P2)**: Conecta la lista de entrada a la bandeja con el acceso a la pantalla de detalle de US1/US2.

### Parallel Opportunities

- T003 y T004 pueden ejecutarse en paralelo dentro de Setup (Phase 1).
- T006, T007 y T008 pueden ejecutarse en paralelo dentro de Foundational (Phase 2).
- T010, T011, T013 y T014 pueden ejecutarse en paralelo dentro de US1 (Phase 3).
- T016, T017 y T019 pueden ejecutarse en paralelo dentro de US2 (Phase 4).
- T021, T022 y T024 pueden ejecutarse en paralelo dentro de US3 (Phase 5).
- T026, T027 y T028 pueden ejecutarse en paralelo en la fase Polish.

---

## Parallel Example: User Story 1

```bash
# Desarrollar los componentes de frontend en paralelo con el endpoint de backend:
Task: "T011 [P] [US1] Implementar endpoint GET /api/v1/review-tray/cases/:idCaso en backend/src/review-tray/review-tray.controller.ts"
Task: "T013 [P] [US1] Desarrollar componente de visor de evidencias en frontend/src/components/VisorEvidencia.tsx"
Task: "T014 [P] [US1] Desarrollar componente de desglose de señales en frontend/src/components/DesgloseSenales.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (Bloqueante crítico)
3. Completar Phase 3: User Story 1 (Visor de caso con hallazgos espaciales)
4. Validar visualización consolidada y resaltado de coordenadas en navegador
5. Demostrar incremento de MVP funcional

### Incremental Delivery

1. Incrementar con Phase 4 (US2): Incorporar resolución humana obligatoria y detección de discrepancias (DEC-04 / DEC-05)
2. Incrementar con Phase 5 (US3): Incorporar lista priorizada de bandeja, SLA en jornada laboral chilena y control de leases (15 min)
3. Ejecutar Phase 6 (Polish): Validar rendimiento < 2s (PX-08), pruebas E2E con Playwright y quickstart
