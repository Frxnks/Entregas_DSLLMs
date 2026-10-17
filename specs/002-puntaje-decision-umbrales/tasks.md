# Tasks: F4 - Puntaje y decisión por umbrales

**Rama de Funcionalidad**: `002-puntaje-decision-umbrales`  
**Especificación**: [spec.md](file:///home/franko/Codigos/Entregas_DSLLMs/specs/002-puntaje-decision-umbrales/spec.md)  
**Plan de Implementación**: [plan.md](file:///home/franko/Codigos/Entregas_DSLLMs/specs/002-puntaje-decision-umbrales/plan.md)  
**Modelo de Datos**: [data-model.md](file:///home/franko/Codigos/Entregas_DSLLMs/specs/002-puntaje-decision-umbrales/data-model.md)  
**Contratos**: [scoring-api.json](file:///home/franko/Codigos/Entregas_DSLLMs/specs/002-puntaje-decision-umbrales/contracts/scoring-api.json)  

---

## Phase 1: Setup (Shared Infrastructure)

**Propósito**: Inicialización de la estructura técnica del monorepositorio, contenedores Docker y dependencias base del motor de evaluación.

- [ ] T001 Crear estructura base del proyecto para backend NestJS y frontend Next.js en `package.json` y `docker-compose.yml` [RQNF-001, RQNF-008]
- [ ] T002 Inicializar aplicación backend NestJS con dependencias de TypeScript, Prisma ORM, Jest y Supertest en `backend/package.json` y `backend/tsconfig.json` [RQNF-001]
- [ ] T003 [P] Configurar reglas de linter y formateador de código en `backend/.eslintrc.js` y `backend/.prettierrc` [RQNF-005]
- [ ] T004 [P] Configurar módulo de archivos estáticos para servir documentos y evidencias de prueba en `backend/src/static-files.module.ts` [RQNF-004]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Propósito**: Infraestructura crítica de persistencia relacional, migraciones y carga de datos semilla que bloquea la ejecución de las historias de usuario.

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta completar esta fase.

- [ ] T005 Definir esquema de base de datos relacional con modelos `Caso`, `Senal`, `Umbral`, `AuditoriaUmbral`, `Evidencia`, `Operador` y `Decision` en `backend/prisma/schema.prisma` [RQF-004, RQF-005, RQF-006, RQNF-005]
- [ ] T006 [P] Generar migración inicial de PostgreSQL con índices compuestos para optimización de consultas en `backend/prisma/migrations/0_init/migration.sql` [RQNF-007]
- [ ] T007 [P] Implementar servicio de conexión a base de datos y ciclo de vida en `backend/src/prisma/prisma.service.ts` y `backend/src/prisma/prisma.module.ts` [RQNF-001, RQNF-005]
- [ ] T008 [P] Configurar filtro global para manejo unificado de excepciones HTTP y códigos de estado en `backend/src/common/filters/http-exception.filter.ts` [RQNF-001]
- [ ] T009 Implementar script de inicialización de semillas con los 3 casos emblemáticos (`CASO-SEED-001`, `CASO-SEED-002`, `CASO-SEED-003`) y evidencias mock en `backend/prisma/seed.ts` [RQF-004, RQF-005, RQF-008, RQF-023, DEC-01, DEC-04]

**Checkpoint**: Base de datos operativa y semillas precalculadas cargadas. Las historias de usuario de scoring pueden comenzar en paralelo.

---

## Phase 3: User Story 1 - Cálculo del Puntaje de Confianza Multimodal Explicable (Priority: P1) 🎯 MVP

**Goal**: Calcular un puntaje numérico consolidado (escala 0 a 100) para cada caso, acompañado del desglose explícito de los componentes de señal (autenticidad documental, consistencia, cruce de fuentes y fraude) para garantizar explicabilidad cuantitativa total.

**Independent Test**: Ejecutar el motor de scoring sobre un expediente de prueba en `backend/test/scoring-engine.spec.ts` y validar que retorna un entero acotado entre 0 y 100 con el desglose pormenorizado de factores positivos y deducciones.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estas pruebas primero y verificar que fallen antes de implementar**

- [ ] T010 [P] [US1] Pruebas unitarias y de contrato para cálculo ponderado (0-100) y desglose estructurado de señales en `backend/test/scoring-engine.spec.ts` [RQF-004, RQNF-001, RQNF-008]

### Implementation for User Story 1

- [ ] T011 [P] [US1] Crear DTOs de solicitud y respuesta de evaluación de caso con tipado estricto en `backend/src/scoring/dto/evaluate-case.dto.ts` y `backend/src/scoring/dto/case-breakdown.dto.ts` [RQF-004, RQNF-001]
- [ ] T012 [US1] Implementar servicio de cálculo ponderado de señales normalizado a escala 0-100 en `backend/src/scoring/scoring-engine.service.ts` [RQF-004, RQNF-008]
- [ ] T013 [US1] Implementar endpoints de evaluación `POST /api/v1/scoring/evaluate` y consulta de desglose `GET /api/v1/scoring/cases/:idCaso/breakdown` en `backend/src/scoring/scoring.controller.ts` [RQF-004, RQNF-001, RQNF-008]
- [ ] T014 [US1] Registrar y configurar módulo de scoring con inyección de dependencias en `backend/src/scoring/scoring.module.ts` y `backend/src/app.module.ts` [RQF-004, RQNF-001]

**Checkpoint**: User Story 1 completamente funcional. El cálculo de puntaje y el desglose de componentes pueden invocarse y testearse de forma independiente.

---

## Phase 4: User Story 2 - Aplicación de Precedencia Absoluta de Señales de Fraude (Priority: P1)

**Goal**: Aplicar la regla de negocio no negociable donde cualquier señal de fraude activa prevalece de forma estricta sobre el puntaje numérico, bloqueando la aprobación automática y derivando obligatoriamente a revisión asistida sin emitir rechazos automáticos.

**Independent Test**: Procesar un caso con puntaje 95 pero con señal de fraude activa en `backend/test/fraud-precedence.spec.ts` y verificar que el veredicto es `DERIVADO_REVISION_ASISTIDA` con causal `FRAUDE` y prioridad `ALTA`.

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Pruebas unitarias para precedencia absoluta de fraude y prohibición de rechazo 100% automático en `backend/test/fraud-precedence.spec.ts` [RQF-007, RQF-008, RQF-023, DEC-04]

### Implementation for User Story 2

- [ ] T016 [P] [US2] Implementar motor de reglas de decisión con jerarquía estricta (1º Fraude, 2º Mínimo de señal, 3º Puntaje global) en `backend/src/scoring/decision-rules.service.ts` [RQF-007, RQF-008, RQF-023, DEC-04]
- [ ] T017 [US2] Integrar intercepción por señales de fraude en la determinación de veredicto asignando causal `FRAUDE` en `backend/src/scoring/scoring-engine.service.ts` [RQF-008, RQF-023]
- [ ] T018 [US2] Persistir caso interceptado por fraude con estado `PENDIENTE_REVISION` y bandera no facturable (`esFacturable = false`) en `backend/src/scoring/scoring.controller.ts` [RQF-007, RQF-008, RQF-023, DEC-01, DEC-04]

**Checkpoint**: User Stories 1 y 2 operativas de forma conjunta e independiente.

---

## Phase 5: User Story 3 - Decisión por Umbrales y Control Estricto de Mínimos por Señal (Priority: P1)

**Goal**: Emitir decisión de aprobación automática únicamente cuando el puntaje alcance el umbral de flujo (por defecto 90 puntos), no existan alertas de fraude y cada señal individual supere su mínimo configurado (mínimo basal de 60 puntos en señales documentales de MVP), derivando a revisión humana en caso contrario.

**Independent Test**: Procesar un caso con puntaje 92 pero con una señal crítica en 50 puntos (menor al mínimo 60) en `backend/test/threshold-decision.spec.ts` y validar que se deriva a revisión con causal explicativa `MINIMO_SENAL`.

### Tests for User Story 3 ⚠️

- [ ] T019 [P] [US3] Pruebas unitarias para control de mínimos individuales por señal y emisión de aprobación automática en `backend/test/threshold-decision.spec.ts` [RQF-005, RQF-022, DEC-01]

### Implementation for User Story 3

- [ ] T020 [P] [US3] Implementar verificación de umbral de aprobación y control de mínimo basal de seguridad (60 puntos) en `backend/src/scoring/decision-rules.service.ts` [RQF-005, RQF-022]
- [ ] T021 [US3] Generar causal de derivación (`MINIMO_SENAL` o `PUNTAJE_INSUFICIENTE`) con razón explicativa en lenguaje natural en `backend/src/scoring/scoring-engine.service.ts` [RQF-007, RQF-008, RQF-022, DEC-04]
- [ ] T022 [US3] Configurar emisión de estado `APROBADO_AUTOMATICO` y marca de facturación comercial (`esFacturable = true`) únicamente ante aprobación concluyente en `backend/src/scoring/scoring.controller.ts` [RQF-005, RQF-015, DEC-01]

**Checkpoint**: Árbol de decisiones completo (aprobación automática concluyente, derivación por fraude, derivación por mínimos y derivación por puntaje) validado.

---

## Phase 6: User Story 4 - Configuración y Auditoría de Umbrales y Mínimos por Flujo (Priority: P2)

**Goal**: Permitir al Administrador de Riesgo parametrizar los umbrales de aprobación y mínimos por señal por flujo de negocio, preservando un rastro de auditoría inalterable (append-only) de cada cambio con autor, fecha/hora y valor previo.

**Independent Test**: Modificar el umbral de aprobación de un flujo mediante `PUT /api/v1/scoring/thresholds/:idFlujo` en `backend/test/threshold-audit.spec.ts` y validar que se genera un nuevo registro histórico en `AuditoriaUmbral`.

### Tests for User Story 4 ⚠️

- [ ] T023 [P] [US4] Pruebas de integración para endpoint de actualización y auditoría inalterable de umbrales en `backend/test/threshold-audit.spec.ts` [RQF-006, RQNF-005]

### Implementation for User Story 4

- [ ] T024 [P] [US4] Definir DTOs para actualización y respuesta de umbrales con validación de rangos (0-100) en `backend/src/scoring/dto/update-threshold.dto.ts` y `backend/src/scoring/dto/threshold-response.dto.ts` [RQF-006, RQNF-005]
- [ ] T025 [US4] Implementar servicio de gestión de umbrales con versionamiento y registro inmutable en `backend/src/scoring/threshold.service.ts` [RQF-006, RQNF-005]
- [ ] T026 [US4] Exponer endpoints GET y PUT `/api/v1/scoring/thresholds/:idFlujo` con registro de auditoría append-only en `backend/src/scoring/scoring.controller.ts` [RQF-006, RQNF-001, RQNF-005]
- [ ] T026b [US4] Desarrollar interfaz de configuración y auditoría de umbrales para el Administrador de Riesgo en `frontend/src/app/configuracion/page.tsx` [RQF-006, RQNF-008]

**Checkpoint**: Todas las historias de usuario de la especificación F4 se encuentran implementadas y probadas.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Propósito**: Verificación de atributos de calidad no funcionales, validación de integridad y documentación técnica de la funcionalidad.

- [ ] T027 [P] Implementar pruebas de verificación extra-funcional para acuse < 1s (PX-01), procesamiento no bloqueante (PX-02), soberanía local sin egreso de PII (PX-03), inalterabilidad append-only (PX-05) y tolerancia a caídas (PX-06) en `backend/test/extra-functional.e2e-spec.ts` [RQNF-001, RQNF-002, RQNF-003, RQNF-005, RQNF-006]
- [ ] T028 [P] Ejecutar validación completa de los escenarios declarados en `specs/002-puntaje-decision-umbrales/quickstart.md` [RQF-004, RQF-005, RQF-015, RQF-022, RQF-023, DEC-01, DEC-04]
- [ ] T029 Documentar manual de referencia de contratos API y reglas de negocio de scoring en `docs/scoring-api-guide.md` [RQF-006, RQNF-008]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas; inicio inmediato.
- **Foundational (Phase 2)**: Depende de Setup (Phase 1). Bloquea la implementación de historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Foundational (Phase 2). Puede ejecutarse en paralelo con US4 o antes de US2 y US3.
- **User Story 2 (Phase 4)**: Depende de US1 (Phase 3) para la estructura de cálculo de señales y persistencia básica.
- **User Story 3 (Phase 5)**: Depende de US1 (Phase 3) y se acopla con el motor de reglas de US2 (Phase 4).
- **User Story 4 (Phase 6)**: Depende de Foundational (Phase 2); puede ejecutarse de manera desacoplada del motor de scoring en memoria.
- **Polish (Phase 7)**: Depende de la finalización de todas las historias de usuario.

### User Story Dependencies

- **US1 (P1)**: Prerrequisito para el cálculo ponderado y el objeto base de evaluación.
- **US2 (P1)**: Extiende el evaluador de veredicto con la regla de intercepción de fraude.
- **US3 (P1)**: Extiende el evaluador de veredicto con la comprobación de umbral global y mínimos por señal.
- **US4 (P2)**: Gestiona la parametrización persistente de los umbrales consumidos por US3.

### Parallel Opportunities

- T003 y T004 pueden ejecutarse en paralelo dentro de Setup (Phase 1).
- T006, T007 y T008 pueden ejecutarse en paralelo dentro de Foundational (Phase 2).
- T010 y T011 pueden ejecutarse en paralelo al inicio de US1 (Phase 3).
- T015 y T016 pueden ejecutarse en paralelo al inicio de US2 (Phase 4).
- T019 y T020 pueden ejecutarse en paralelo al inicio de US3 (Phase 5).
- T023 y T024 pueden ejecutarse en paralelo al inicio de US4 (Phase 6).
- T027 y T028 pueden ejecutarse en paralelo en la fase Polish.

---

## Parallel Example: User Story 1

```bash
# Escribir la prueba unitaria de scoring y los DTOs en paralelo:
Task: "T010 [P] [US1] Pruebas unitarias y de contrato para cálculo ponderado (0-100) en backend/test/scoring-engine.spec.ts"
Task: "T011 [P] [US1] Crear DTOs de solicitud y respuesta de evaluación de caso en backend/src/scoring/dto/evaluate-case.dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (Bloqueante crítico)
3. Completar Phase 3: User Story 1 (Cálculo de puntaje explicable 0-100)
4. Validar cálculo ponderado y estructura de desglose de señales en modo aislado
5. Desplegar / demostrar incremento de MVP

### Incremental Delivery

1. Incrementar con Phase 4 (US2): Incorporar intercepción por precedencia de fraude (DEC-04)
2. Incrementar con Phase 5 (US3): Incorporar control de mínimos y aprobación automática facturable (DEC-01)
3. Incrementar con Phase 6 (US4): Incorporar parametrización y auditoría inalterable de umbrales
4. Ejecutar Phase 7 (Polish): Validar rendimiento < 1s, inalterabilidad y ejecutar quickstart
