# Matriz de pruebas automatizadas — F1 y F4

**Fecha de ejecución:** 2026-10-18
**Revisión del repositorio:** `459522e` (HEAD antes de añadir esta matriz; sin cambios de código fuente para esta verificación).
**Alcance:** archivos de pruebas versionados bajo `backend/test/` y `frontend/tests/`; no incluye tests ocultos de dependencias.

## Resultado de los comandos

| Comando | Resultado observado |
|---|---|
| `Set-Location backend; npx.cmd prisma generate` | Exit code 0. Prisma Client v5.22.0 generado en `node_modules/@prisma/client`. |
| `npm.cmd --prefix backend run test -- --runInBand` | 16 suites aprobadas, 172 pruebas aprobadas, 0 fallidas. |
| `npm.cmd --prefix frontend run typecheck` | Exit code 0; `tsc --noEmit` sin errores. |
| `npm.cmd --prefix backend run test:e2e -- --runInBand` | 3 suites aprobadas, 41 pruebas aprobadas, 0 fallidas. Son un subconjunto del comando anterior; no deben sumarse otra vez al total de 172. |
| `PLAYWRIGHT_TEST_BASE_URL=http://localhost:13020 npm.cmd --prefix frontend run test:e2e -- --reporter=list` | 6 pruebas aprobadas, 0 fallidas. Tiempo reportado por la prueba PX-08: 477 ms. El navegador Chromium se instaló porque inicialmente no estaba presente. |

Las pruebas backend `*.e2e-spec.ts` montan una aplicación NestJS mediante Supertest, pero sustituyen Prisma por mocks en memoria; no son una prueba end-to-end contra PostgreSQL. Playwright se ejecutó contra la interfaz del clon limpio aislado; sus handlers de decisión y lease interceptan esas llamadas. El bundle del frontend apunta al host API configurado en su build, por lo que estas pruebas no constituyen una validación completa de despliegue/producción.

## Archivos de prueba y trazabilidad

En la columna “PF/PX Entrega 1” se indican solo identificadores que existen en la matriz de Entrega 1 (`docs/entrega1/prueba.md`). Los IDs PF/PX incorporados en Entrega 2 se indican aparte. “Parcial” significa que el test automatiza una parte del criterio, no su aceptación completa.

| Archivo de prueba | RQF/RQNF de F1/F4 relacionados | PF/PX Entrega 1 relacionados | Casos añadidos en specs E2 | Alcance y limitación observada |
|---|---|---|---|---|
| [audit-immutability.e2e-spec.ts](../../../backend/test/audit-immutability.e2e-spec.ts) | RQNF-005 | PX-05 | — | Comprueba el middleware Prisma contra update/delete y permite create. Usa mocks; no verifica escritura real, registro del intento ni acceso efectivo con un administrador en una base desplegada. |
| [case-detail.spec.ts](../../../backend/test/case-detail.spec.ts) | RQF-002, RQF-009, RQF-020, RQF-024 | PF-02, PF-09 | PF-20, PF-24 | Prueba DTO/servicio de detalle, legibilidad, hallazgos espaciales y lease asociado. PF-02 se cubre parcialmente: el escenario Entrega 1 incluye tres archivos con uno corrupto y procesamiento del resto. |
| [case-resolution.spec.ts](../../../backend/test/case-resolution.spec.ts) | RQF-010, RQF-011 | PF-10, PF-11 | — | Prueba HTTP/servicio con Prisma mock para resolución, discrepancia y validación de petición; no comprueba persistencia durable real. |
| [chilean-calendar.spec.ts](../../../backend/test/chilean-calendar.spec.ts) | RQF-021 | — | PF-21 | Comprueba calendario y semáforo, incluidos fin de semana/feriado. No automatiza la notificación real al supervisor ni la operación de escalado en producción. |
| [concurrency.spec.ts](../../../backend/test/concurrency.spec.ts) | RQF-024 | — | PF-24 | Comprueba reglas unitarias del lease, colisión, liberación y expiración con Prisma mock; no valida concurrencia distribuida en PostgreSQL ni carrera real first-to-submit. |
| [extra-functional.e2e-spec.ts](../../../backend/test/extra-functional.e2e-spec.ts) | RQNF-001, RQNF-002, RQNF-003, RQNF-005, RQNF-006 | PX-01, PX-02, PX-03, PX-05, PX-06 | — | Incluye latencia, llamadas concurrentes, sanitización, fallos upstream y auditoría. El servicio Prisma está mockeado; los resultados no prueban infraestructura, residencia territorial, disponibilidad mensual o procesamiento asíncrono real. |
| [extra-functional-f1.e2e-spec.ts](../../../backend/test/extra-functional-f1.e2e-spec.ts) | RQNF-001, RQNF-003, RQNF-004, RQNF-006 | PX-01, PX-03, PX-04, PX-06 | — | Prueba enmascaramiento, hash y escenarios de falla/latencia con mocks. Hash no equivale a cifrado ni retención; no demuestra residencia de datos ni 99,9 % de disponibilidad. |
| [fraud-precedence.spec.ts](../../../backend/test/fraud-precedence.spec.ts) | RQF-007, RQF-008, RQF-023 | PF-07, PF-08 | PF-23 | Comprueba que fraude prevalece y deriva, incluso con puntaje alto. No cubre por sí sola la persistencia de todas las causales concurrentes en el desglose completo exigido por RQF-023. |
| [pii-masking.spec.ts](../../../backend/test/pii-masking.spec.ts) | RQNF-003 | PX-03 | — | Comprueba funciones de enmascaramiento/hash en aislamiento. No prueba despliegue en Chile ni inspección de tráfico saliente real. |
| [quickstart-validation.spec.ts](../../../backend/test/quickstart-validation.spec.ts) | RQF-005, RQF-008, RQF-009, RQF-010, RQF-011, RQF-021, RQF-023; RQNF-005 | PF-05, PF-08, PF-09, PF-10, PF-11; PX-05 | PF-21, PF-23 | Integra escenarios del quickstart con mocks Prisma. Verifica reglas y respuestas de servicios, no despliegue ni escritura durable. |
| [resolution.spec.ts](../../../backend/test/resolution.spec.ts) | RQF-010, RQF-011 | PF-10, PF-11 | — | Prueba validación de motivo, first-to-submit de servicio y discrepancia; mocks, por lo que la atomicidad real de DB queda sin certificar. |
| [scoring-engine.spec.ts](../../../backend/test/scoring-engine.spec.ts) | RQF-004, RQF-005, RQF-008, RQF-022 | PF-04, PF-05, PF-07 | PF-22 | Comprueba fórmula, desglose y decisión a nivel de servicio/controlador. Hay fixtures propios; no valida que los datos del seed reflejen esa fórmula (ver desviación de `CASO-SEED-002` en [verificacion_F4.md](./verificacion_F4.md)). |
| [scoring-quickstart.spec.ts](../../../backend/test/scoring-quickstart.spec.ts) | RQF-004, RQF-005, RQF-007, RQF-008, RQF-021, RQF-022, RQF-023 | PF-04, PF-05, PF-07, PF-08 | PF-21, PF-22, PF-23 | Simula solicitudes HTTP al módulo de scoring con Prisma mock. Varios datos de caso/fixtures están codificados en el test y no cargan el seed real. |
| [sla-concurrency.spec.ts](../../../backend/test/sla-concurrency.spec.ts) | RQF-021, RQF-024; RQNF-001 | PX-01 | PF-21, PF-24 | Comprueba cálculos SLA, API/mapeo de bandeja, lease y estado vencido mediante mocks. No acredita notificación real, p95 bajo carga real ni exclusión concurrente durable. |
| [threshold-audit.spec.ts](../../../backend/test/threshold-audit.spec.ts) | RQF-006, RQNF-005 | PF-06, PX-05 | — | Comprueba endpoints, validaciones, versiones e historial con mocks. PF-06b (rechazar publicación sin módulos activos) no aparece cubierto por este test ni por la matriz F4 de la spec actual. |
| [threshold-decision.spec.ts](../../../backend/test/threshold-decision.spec.ts) | RQF-004, RQF-005, RQF-007, RQF-015, RQF-022 | PF-04, PF-05, PF-07, PF-15 | PF-22 | Comprueba árbol de decisión, mínimos y facturación con fixtures/mocks. La cobertura de RQF-015 no prueba contabilización comercial en un sistema externo. |
| [review-flow.e2e.spec.ts](../../../frontend/tests/review-flow.e2e.spec.ts) | RQF-009, RQF-010, RQF-011, RQF-020; RQNF-008 (Should) | PF-09, PF-10, PF-11; PX-08 | PF-20 | Navega por bandeja/expediente, verifica señal, motivo corto y flujo UI de decisión; mockea lease y resolución. El test de RQF-020 comprueba textos/hallazgo pero no aserciones geométricas de la posición del bounding box; configuración y discrepancias prueban presencia de pantalla. |

## Requisitos Must del alcance y brechas de automatización

El alcance funcional Must se toma de las matrices de F1 y F4 en `specs/001-bandeja-revision-asistida/spec.md` y `specs/002-puntaje-decision-umbrales/spec.md`, no se deduce del nombre de cada test.

### Requisitos funcionales

| Funcionalidad | Requisito Must | Casos de Entrega 1 / E2 | Cobertura observada | Estado frente al criterio |
|---|---|---|---|---|
| F1 | RQF-002 | PF-02 | Caso ilegible individual probado; no se comprueba el expediente de tres evidencias y continuidad de las otras dos. | Parcial |
| F1/F4 | RQF-007 | PF-07 | Derivación/no rechazo cubierta por servicios y pruebas HTTP simuladas; algunos escenarios no usan el valor 45 del PF original. | Parcial; regla cubierta, exactitud del PF no completa |
| F1/F4 | RQF-008 | PF-08 | Fraude con puntaje alto y puntaje bajo derivado cubiertos por lógica y pruebas con mocks. | Parcial |
| F1 | RQF-009 | PF-09 | Detalle/API probado; Playwright muestra pantalla pero los handlers/listado dependen del backend existente y no verifican el expediente entero como criterio de usabilidad. | Parcial |
| F1 | RQF-010 | PF-10 | Validación de motivo, respuesta y política append-only probadas en capas separadas; no hay persistencia durable integrada con PostgreSQL en el e2e. | Parcial |
| F1 | RQF-011 | PF-11 | Discrepancia se prueba en servicio/API/UI, con respuesta de decisión mockeada en Playwright. | Parcial |
| F1 | RQF-020 | Nuevo PF-20 | Se comprueba evidencia y datos de hallazgo; la interfaz no tiene aserción que compare la geometría renderizada del bounding box con las coordenadas del documento. | Parcial |
| F1 | RQF-021 | Nuevo PF-21 | Calendario, cálculo y estado vencido tienen tests; no se automatiza notificación a supervisor ni el escalado operativo completo. | Parcial |
| F1 | RQF-024 | Nuevo PF-24 | Lease/colisión/expiración se prueban con mocks; no se verifica lease renovado por heartbeat de 15 min ni carrera first-to-submit entre procesos/DB. | Parcial |
| F4 | RQF-004 | PF-04 | Fórmula, normalización y desglose probados; el seed `CASO-SEED-002` presenta discrepancia 74,25 calculado vs. 74 almacenado (fase 3). | Parcial; inconsistencia concreta |
| F4 | RQF-005 | PF-05 | Aprobación ante puntaje suficiente se prueba en motor/servicio. Los casos de prueba usan fixtures y no certifican los datos reales del seed. | Cubierto en lógica; integración parcial |
| F4 | RQF-006 | PF-06 y PF-06b en E1 | Cambio/versionado/auditoría probado con mock. No aparece prueba de PF-06b (flujo sin módulos activos); ese criterio tampoco figura en los RQF de la spec E2. | Parcial; PF-06b sin cobertura |
| F4 | RQF-007 | PF-07 | Coincide con cobertura compartida de F1; no se automatiza exactamente la precondición 45 del PF de E1. | Parcial |
| F4 | RQF-008 | PF-08 | Casos de fraude y puntaje bajo probados con mocks. | Parcial |
| F4 | RQF-015 | PF-15 en E1 | Se comprueba `esFacturable` true/false en respuestas/servicios; no se integra con contabilización comercial real. En E1 era Should; en E2 F4 aparece Must. | Parcial |
| F4 | RQF-022 | Nuevo PF-22 | Mínimo individual prevalece sobre puntaje global en pruebas de decisión/scoring. | Cubierto en regla; integración parcial |
| F4 | RQF-023 | Nuevo PF-23 | Precedencia de fraude está probada; falta aserción del requisito de registrar todas las causales concurrentes en el desglose. | Parcial |

### Requisitos no funcionales

| Funcionalidad | Requisito Must | PX Entrega 1 | Cobertura y brecha |
|---|---|---|---|
| F1/F4 | RQNF-001 | PX-01 | Hay mediciones puntuales de endpoint y solicitudes simuladas concurrentes. No se mide el p95 bajo la carga de aceptación de Entrega 1 en un sistema persistente integrado. |
| F4 | RQNF-002 | PX-02 | Hay pruebas de concurrencia/no bloqueo sobre una app con Prisma mock. No hay cola o procesamiento asíncrono de evidencia pesada end-to-end demostrada. |
| F1/F4 | RQNF-003 | PX-03 | Se automatiza máscara/sanitización. Residencia física nacional y ausencia de egreso de PII a través de infraestructura real no se demuestran con unit tests. |
| F1 | RQNF-004 | PX-04 | Se valida hash/metadatos de evidencia. Cifrado en tránsito/reposo y retención 90 días/5 años no tienen prueba automatizada observada. |
| F1/F4 | RQNF-005 | PX-05 | Middleware append-only probado; los tests simulan Prisma y no verifican datos persistidos ni log de intento contra DB real. |
| F1/F4 | RQNF-006 | PX-06 | Hay simulaciones de fallo upstream en mocks. No se automatiza disponibilidad mensual 99,9 %, colas ni recuperación sin pérdida a nivel de infraestructura. |
| F1 | RQNF-008 (Should) | PX-08 | Playwright reportó 477 ms para cargar `/bandeja`; el resto de la suite aprobó. Esto prueba un escenario con el entorno/cache disponible, no la facilidad de uso de una persona sin capacitación. |
| F4 | RQNF-008 (Should) | PX-08 | Las pruebas del desglose cubren estructura; no hay medición específica contra el umbral <500 ms del PX-08 F4. |

## Casos Must de Entrega 1 sin contraparte directa en las specs actuales

- **PF-06b:** figura como caso Must de Entrega 1 para rechazar publicación de un flujo sin módulos analíticos. No aparece en la matriz de requisitos/casos de F4 E2 ni en los archivos automatizados identificados.
- Los PF/PX de nuevos requisitos E2 —PF-20 a PF-24 y PX-08 F1/F4— no existían como IDs en Entrega 1; son criterios de verificación agregados en las specs E2.
- La cobertura funcional de la entrega no equivale a probar todos los Must de Entrega 1: la especificación delimita F1/F4. Requisitos fuera de F1/F4 como conectores de carpeta, SSO, importación, callbacks y exportación no se consideran faltantes de test del alcance de este incremento.

## Pruebas más cercanas a implementación que a aceptación

1. **Tests de servicios con Prisma mock** verifican ramas, status, objetos DTO y llamadas esperadas, pero no el comportamiento final después de persistir/consultar en PostgreSQL.
2. **`audit-immutability.e2e-spec.ts` y otros `*.e2e-spec.ts`** se ejecutan con `test:e2e`, pero la comprobación de inmutabilidad y los NFR usan mocks/middleware, no un entorno integrado con permisos y DB.
3. **El PX-08 de Playwright** mide la carga de una página en un navegador local y datos de API disponibles; no mide por sí solo que un operador sin capacitación resuelva satisfactoriamente un caso.
4. **El test de bounding boxes** comprueba presencia de señales/textos asociados, no la posición visual contra coordenadas de píxel.
5. **Los tests de facturación y de configuración de umbrales** verifican campos/servicios, no un libro de facturación ni un flujo real de autorización de Administrador de Riesgo.
6. **Los escenarios codificados de scoring** incluyen fixtures que pueden divergir del seed. En esta revisión se confirmó con API que `CASO-SEED-002` pondera 80×0,4 + 65×0,35 + 78×0,25 = 74,25 mientras persiste 74; registrado aparte sin alterar regla ni seed.

## PF/PX de Entrega 1 no automatizados o no reproducidos fielmente

- **PF-06b:** sin test automático identificado y sin criterio equivalente en la spec F4 E2.
- **PF-02:** automatiza evidencia ilegible aislada, no el escenario original de tres archivos (uno inválido y los otros dos procesados).
- **PF-07:** la regla de puntaje bajo se automatiza, pero no todos los tests usan el caso exacto de 45 puntos de Entrega 1.
- **PF-09/PF-20:** tests de servicio/UI verifican campos o la existencia de señales; no validan completamente la experiencia de inspección espacial contra imagen/documento real.
- **PF-10/PF-11:** existen pruebas de resolución y discrepancia, pero la UI mockea la respuesta y la capa de DB está separada; falta una prueba integrada de escritura y posterior lectura inmutable.
- **PF-21/PF-24:** calendario y lease sí se prueban; notificación al supervisor, heartbeat de 15 minutos y first-to-submit bajo concurrencia distribuida no se verifican completamente.
- **PX-01/PX-02:** escenarios de mock no equivalen a 100 evaluaciones concurrentes persistidas ni al trabajo asíncrono real con múltiples evidencias.
- **PX-03/PX-04/PX-05/PX-06:** la cobertura unitaria no prueba ubicación de infraestructura, cifrado/retención, auditoría durable con privilegios reales, ni SLO mensual y recuperación de infraestructura.
- **PX-07 (Should, 15.000 casos/mes en F4):** no se encontró archivo de prueba de carga sostenida ni comando de benchmark en la suite.
- **PX-08 F4:** no se encontró medición automatizada específica del desglose bajo 500 ms.

Los IDs PF/PX exactos son los de [Entrega 1](../../entrega1/prueba.md); los requisitos y casos incorporados posteriormente se cotejaron con las specs de [F1](../../../specs/001-bandeja-revision-asistida/spec.md) y [F4](../../../specs/002-puntaje-decision-umbrales/spec.md).
