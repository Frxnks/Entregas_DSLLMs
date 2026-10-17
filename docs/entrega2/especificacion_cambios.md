# Informe de Cambios en la Fase de Especificación (SPECS)
**Proyecto:** Plataforma MIRA — DPRIME SpA  
**Entrega:** Entrega 2  
**Fecha:** 17 de Octubre de 2026  
**Autores / Revisores:** Dante Chávez, Nikolas Lagos (Representante del Cliente), Franko Moraga y Felipe Caru  
**Funcionalidades Especificadas:** 
- `F1 - Bandeja de revisión asistida` (`specs/001-bandeja-revision-asistida/spec.md`)
- `F4 - Puntaje y decisión por umbrales` (`specs/002-puntaje-decision-umbrales/spec.md`)

---

## 1. Introducción y Contexto

En la **Entrega 1**, el equipo formalizó el análisis de requisitos del sistema a partir de las entrevistas con los interesados y el documento fundacional de necesidades, registrando los primeros 18 Requisitos Funcionales (`RQF-001` a `RQF-018`), 8 Requisitos No Funcionales (`RQNF-001` a `RQNF-008`), 10 Decisiones de Negocio (`DEC-01` a `DEC-10`), 3 Casos de Uso centrales (`CU-01`, `CU-02`, `CU-03`) y 13 Historias de Usuario (`HU-001` a `HU-013`).

Para la **Entrega 2**, bajo la metodología **Spec-Driven Development (SDD)** y el flujo `/speckit-specify`, se procedió a redactar las especificaciones funcionales formales de las dos capacidades prioritarias del núcleo de procesamiento y resolución:
- **F1**: Bandeja de revisión asistida (foco en control humano, inspección localizada de evidencia y gestión de carga operativa).
- **F4**: Puntaje y decisión por umbrales (foco en cálculo de confianza, control estricto de mínimos y prevalencia de fraude).

Este documento registra los cambios ocurridos entre la Entrega 1 y la especificación de la Entrega 2, detallando la evolución de los requisitos, las decisiones autónomas del agente de IA y las métricas de coautoría humano-máquina.

---

## 2. Matriz Comparativa de Requisitos (Entrega 1 vs. Entrega 2)

A continuación se presenta la tabla exhaustiva de trazabilidad de todos los requisitos de la Entrega 1 (`LLMS.docx` y `prueba.md`), contrastados contra el estado de la especificación técnica en la Entrega 2, categorizados como **Mantenido**, **Modificado / Ampliado**, **Fuera de Alcance de F1/F4 (Diferido a su propia spec)** o **Descartado / Excluido**:

| ID Requisito | Tipo | Descripción Original (Entrega 1) | Estado en Entrega 2 | Detalle de Cambios y Destino en Entrega 2 |
| :--- | :--- | :--- | :--- | :--- |
| **RQF-001** | Funcional | Ingresar expedientes vía API o carpeta compartida con `idCaso` único y permanente. | **Fuera de Alcance F1/F4** | Mantenido en el backlog general del producto; corresponde al módulo de Ingesta (`CU-01`) que será especificado en su propia funcionalidad. |
| **RQF-002** | Funcional | Verificar legibilidad de evidencia y reportar razón en lenguaje no técnico. | **Mantenido como Caso Borde** | Se preserva en el backlog de ingesta; en F1 se incorporó como caso de borde del visor documental (§1 Casos Borde y SC-002). |
| **RQF-003** | Funcional | Ante evidencia nueva sobre caso cerrado, abrir nuevo caso vinculado sin reabrir original. | **Mantenido como Caso Borde** | Se incorporó en F1 (§1 Casos Borde) como regla de visualización en la bandeja para casos vinculados con historial previo. |
| **RQF-004** | Funcional | Calcular puntaje de confianza (0–100) con desglose de señales. | **Mantenido e Integrado** | Núcleo de **F4**: especificado en la Historia de Usuario 1, caso de prueba `PF-04`, criterio de éxito `SC-001` y entidad `PuntajeConfianza`. |
| **RQF-005** | Funcional | Aprobar automáticamente solo si puntaje alcanza umbral y no hay alertas de fraude. | **Mantenido e Integrado** | Núcleo de **F4**: especificado en la Historia de Usuario 3, caso de prueba `PF-05`, criterio `SC-003` y regla de validación facturable (`DEC-01`). |
| **RQF-006** | Funcional | Configurar umbral de aprobación por flujo, con auditoría de autor, fecha y valor anterior. | **Modificado / Ampliado** | Núcleo de **F4** (HU-4, `PF-06`, `PF-06b`). Se corrigió su referencia de fuente formal de `DEC-07` a `DEC-11` (tras consolidar la constitución) y se amplió para gobernar mínimos de señal. |
| **RQF-007** | Funcional | Prohibición absoluta de rechazo 100% automático: derivar a revisión humana. | **Modificado / Ampliado** | Núcleo de **F1** y **F4** (F1 HU-2, F4 HU-2/HU-3, `PF-07`). Referenciado formalmente a `DEC-04` y Principio Constitucional II. Se amplió prohibiendo cierres desestimatorios al expirar el SLA. |
| **RQF-008** | Funcional | Derivar a la bandeja todo caso bajo el umbral o con alerta de fraude activa. | **Modificado / Ampliado** | Núcleo de **F1** y **F4** (F1 HU-1, F4 HU-2, `PF-08`). Se vinculó con `DEC-04` y se especificaron las razones textuales explícitas de derivación. |
| **RQF-009** | Funcional | Mostrar al operador en una sola pantalla: evidencia, puntaje, señales y razón de derivación. | **Mantenido e Integrado** | Núcleo de **F1**: especificado en la Historia de Usuario 1, caso de prueba `PF-09` y criterio de éxito `SC-001`. |
| **RQF-010** | Funcional | Registrar de forma inalterable la decisión del operador y su motivo. | **Mantenido e Integrado** | Núcleo de **F1**: especificado en la Historia de Usuario 2, caso de prueba `PF-10` y entidad `DecisionOperador`. |
| **RQF-011** | Funcional | Marcar caso para revisión de modelos cuando operador contradiga sugerencia de MIRA. | **Mantenido e Integrado** | Núcleo de **F1**: especificado en la Historia de Usuario 2, caso de prueba `PF-11`, criterio de éxito `SC-005` y cola de discrepancias (§2.18). |
| **RQF-012** | Funcional | Conector de carpeta compartida para sistemas centrales legacy. | **Fuera de Alcance F1/F4** | Mantenido en el backlog general; pertenece al módulo desacoplado de integración (`DEC-08` / `CU-01`). |
| **RQF-013** | Funcional | Autenticar usuarios del cliente mediante SSO/SAML federado corporativo. | **Mantenido como Precondición** | Preservado como estándar transversal de autenticación (`DEC-09`); gobierna la identidad del operador en F1 y del Administrador de Riesgo en F4. |
| **RQF-014** | Funcional | Anonimizar datos personales (PII) a solicitud del titular preservando traza de auditoría. | **Fuera de Alcance F1/F4** | Mantenido en backlog general (`DEC-05` / Principio Constitucional IV); corresponde al módulo de auditoría y privacidad. |
| **RQF-015** | Funcional | Contabilizar como facturable solo decisiones automáticas concluyentes. | **Mantenido e Integrado** | Integrado en **F4** (HU-3 Escenario 1 y `SC-006`): se garantiza que los casos derivados a F1 tienen 0% de cobro comercial de software (`DEC-01`). |
| **RQF-016** | Funcional | Exportar flujos, resultados e historial en formato no propietario. | **Fuera de Alcance F1/F4** | Mantenido en backlog general (`Should`); se diferirá a la fase de utilidades de administración de datos. |
| **RQF-017** | Funcional | Notificar al sistema de origen mediante callback cuando el caso cambie de estado. | **Fuera de Alcance F1/F4** | Mantenido en backlog general (`Could`); corresponde al módulo de eventos y webhooks (`DEC-07`). |
| **RQF-018** | Funcional | Migrar casos procesados en pilotos anteriores. | **Descartado / Excluido** | Ratificado como `Won't` en estricto cumplimiento de §5.1 de `Descripción del proyecto.docx`. |
| **RQNF-001** a **RQNF-008** | No Funcionales | Requisitos de rendimiento, asincronía, soberanía territorial de datos, retención por capas, inalterabilidad, SLA y usabilidad. | **Mantenidos como Restricciones** | Consolidados como principios rectores en la Constitución de MIRA y referenciados en las pruebas de usabilidad (`SC-001` / `RQNF-008`) y resiliencia (`RQNF-006`). |

---

### Nuevos Requisitos Funcionales Incorporados en la Entrega 2

Durante el proceso de especificación conducido por el agente bajo la directriz humana de lograr completitud operativa sobre `F1` y `F4`, se incorporaron **5 nuevos requerimientos funcionales** (`RQF-020` a `RQF-024`), fundamentados directamente con citas textuales desde el documento fundacional `Descripción del proyecto.docx`:

| ID Requisito | Funcionalidad | Requisito Formal | Prioridad | Fuente Textual | Verificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RQF-020** | **F1** | Permitir al operador inspeccionar cada pieza de evidencia visualizando el hallazgo detectado y su ubicación espacial exacta (`bounding box` o región delimitada) dentro del documento o imagen analizada. | Must | §2.5, §2.7, ENT5 (Marco Peñailillo) | `PF-20` |
| **RQF-021** | **F1** | Mostrar en la bandeja de revisión asistida el tiempo restante para la resolución de cada caso según el SLA computado en días y horas hábiles laborables (Lun-Vie 08:30–18:30 hrs de Chile), emitir alertas visuales de vencimiento inminente (<24h hábiles), y al expirar el plazo sin decisión, escalarlo automáticamente a supervisión con estado `Vencido_Escalado` notificando al supervisor. | Must | §2.7, §2.15, §3, ENT4 (Francisca Leiva) | `PF-21` |
| **RQF-022** | **F4** | Derivar obligatoriamente a revisión asistida cualquier caso en el que una o más señales individuales no alcancen el umbral mínimo configurado para dicha señal (aplicando por defecto un mínimo basal de seguridad de 60 puntos en señales documentales del MVP, editable por Riesgo), aun cuando el puntaje global supere el umbral de aprobación automática. | Must | §2.6, ENT3 (Sebastián Alarcón), ENT4 | `PF-22` |
| **RQF-023** | **F4** | Aplicar la regla de precedencia absoluta a las señales de fraude sobre el puntaje total y los mínimos de señal según jerarquía estricta (1º Fraude, 2º Mínimo de señal, 3º Puntaje global), de modo que ante causales concurrentes, el caso se clasifique bajo la causal más crítica (`Derivado_A_Revision_Humana_Fraude`) e inhabilite la aprobación automática, registrando todas las causales concurrentes en el desglose explicativo. | Must | §2.6, §3, DEC-04 | `PF-23` |
| **RQF-024** | **F1** | Proveer una interfaz de lista de trabajo en la bandeja de revisión asistida que presente los casos derivados asignables ordenados por prioridad y SLA, soportando lectura concurrente multiusuario y asignando un arriendo temporal de edición (lease de 15 min renovable por heartbeat, liberable tras 15 min de inactividad) con confirmación atómica (first-to-submit) para prevenir colisiones resolutivas. | Must | §2.7, §2.15, ENT4 | `PF-24` |

---

## 3. Elementos Agregados por el Agente sin Respaldo Inicial (Decisiones Autónomas y Alucinaciones)

Durante la generación de las especificaciones mediante IA, el agente tomó ciertas decisiones autónomas para cerrar vacíos de especificación o introdujo supuestos operativos no detallados en el texto original. A continuación se documenta el análisis crítico realizado por el equipo humano sobre estos elementos:

### Caso 1: Ventana de alerta visual en "< 24 horas" y código cromático (ámbar/rojo)
- **Qué agregó el agente:** En la Historia de Usuario 3 de F1 y el criterio `SC-006`, el agente definió que la alerta de vencimiento inminente se gatilla exactamente cuando restan menos de 24 horas para expirar el SLA, asociando advertencias cromáticas (ámbar/rojo).
- **Respaldo en fuentes:** §2.7 y ENT4 exigían "mostrar el tiempo restante y alertar cuando un caso esté por vencer", pero ninguna fuente establecía el umbral temporal de 24 horas ni la codificación de color.
- **Dictamen del equipo humano:** **ACEPTADO**.
- **Criterio de aceptación:** Provee una regla de ingeniería verificable y cuantitativa para el frontend. Un requerimiento sin ventana de tiempo numérica no es testeable en software.

### Caso 2: Cómputo de SLA en tiempo continuo 24/7 (Borrador inicial)
- **Qué agregó el agente:** En el primer borrador de `RQF-021`, el agente asumió un cronómetro continuo estándar de 24 horas al día, 7 días a la semana.
- **Respaldo en fuentes:** Contradecía abiertamente la entrevista ENT4 (Francisca Leiva), donde se estipuló que la aseguradora compromete días hábiles con el asegurado y que la CMF mide el servicio en días hábiles.
- **Dictamen del equipo humano:** **RECHAZADO Y CORREGIDO**.
- **Criterio de rechazo:** Un cronómetro continuo provocaría que los expedientes ingresados un viernes por la tarde vencieran durante el fin de semana, emitiendo falsas alarmas y saturando al personal de supervisión en períodos inhábiles. Se forzó la clarificación y se reescribió a horario hábil chileno (08:30 a 18:30 hrs).

### Caso 3: Propuesta de bloqueo monousuario estricto para la lista de trabajo
- **Qué agregó el agente:** En la primera formulación de `RQF-024` y en la opción recomendada durante la clarificación, el agente propuso un bloqueo de acceso exclusivo donde ningún otro usuario podía siquiera abrir un caso tomado por un operador.
- **Respaldo en fuentes:** No existía detalle arquitectural de concurrencia en `Descripción del proyecto.docx`.
- **Dictamen del equipo humano:** **RECHAZADO Y REFORMULADO (Combinación A y C)**.
- **Criterio de rechazo:** El Representante del Cliente señaló que supervisores y compañeros de equipo necesitan inspeccionar expedientes para resolver consultas en paralelo. Se reformuló a un esquema híbrido: lectura concurrente libre, arriendo temporal de edición de 15 minutos solo al iniciar la resolución, y confirmación atómica *first-to-submit*.

### Caso 4: Nombres técnicos formales de enumerados y estados del ciclo de vida
- **Qué agregó el agente:** Creación de identificadores de estado como `Derivado_A_Revision_Humana_Fraude`, `Derivado_A_Revision_Humana_Minimo_Senal`, `Derivado_A_Revision_Humana_Puntaje` y `Vencido_Escalado`.
- **Respaldo en fuentes:** Las fuentes utilizaban términos genéricos en lenguaje natural ("escalar", "derivar", "rechazar").
- **Dictamen del equipo humano:** **ACEPTADO**.
- **Criterio de aceptación:** Indispensable para tipar fuertemente las entidades del dominio en el modelo de datos y permitir que las APIs de eventos y filtros de bandeja operen de forma inequívoca.

### Caso 5: Piso basal de 60 puntos para señales documentales del MVP
- **Qué agregó el agente:** Proponer e incorporar como valor basal por defecto 60 puntos para los mínimos de señales documentales en el MVP (`RQF-022`), basándose en el rango histórico de §2.6 ("bajo 60 se escala o se rechaza").
- **Respaldo en fuentes:** ENT3 y §2.6 indicaban textualmente que los mínimos estaban "pendientes de definir con el área de riesgo".
- **Dictamen del equipo humano:** **ACEPTADO**.
- **Criterio de aceptación:** Evita que el motor apruebe automáticamente casos con documentos severamente viciados antes de que el cliente realice la parametrización en el diseñador de flujos. Mantiene la salvaguarda de ser configurable por el Administrador de Riesgo.

---

## 4. Proporción de Autoría: Agente de IA vs. Equipo Humano

Para evaluar la productividad, autonomía y control de calidad en el proceso de desarrollo asistido por IA, se midió la proporción de texto y decisiones entre el agente y el equipo humano:

### Métricas Cuantitativas de Código / Especificación

| Artefacto de Especificación | Líneas Iniciales (Agente - Commit `184d9a3`) | Líneas Modificadas / Clarificadas (Feedback Humano - Commit `8310291`) | Total Líneas Finales | % Redactado por Agente | % Refinado / Dirigido por Humanos |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `specs/001-bandeja-revision-asistida/spec.md` | 154 | +28 / -9 | 165 | 83% | 17% |
| `specs/002-puntaje-decision-umbrales/spec.md` | 163 | +21 / -6 | 173 | 88% | 12% |
| **Total Global** | **317** | **+49 / -15** | **338** | **85.5%** | **14.5%** |

### Análisis Cualitativo de la Distribución del Esfuerzo

1. **Generación por el Agente (~85% del volumen textual)**:
   - Redacción completa de las historias de usuario en formato estándar de industria (*Como... Quiero... Para...*).
   - Estructuración de escenarios BDD (*Dado... Cuando... Entonces...*) cubriendo caminos felices y excepciones.
   - Creación de matrices de trazabilidad, definición de pruebas funcionales asociadas (`PF-XX`), criterios de éxito medibles (`SC-XX`) y modelado de entidades de dominio.
   - Búsqueda y transcripción de citas textuales exactas desde `Descripción del proyecto.docx` para justificar los nuevos requerimientos.

2. **Dirección, Intervención y Reescritura Humana (~15% directo, 100% de la gobernanza)**:
   - **Formulación del requerimiento inicial**: Instrucción de mantener numeración formal de `LLMS.docx` y crear la serie `RQF-020` a `RQF-024`.
   - **Corrección de sesgos de automatización**: Rechazo del cómputo continuo 24/7 y fijación de horario laboral hábil chileno.
   - **Diseño del protocolo de concurrencia**: Instrucción explícita de combinar alternativas ("combinar A y C") para habilitar lectura concurrente con lease de edición atómico.
   - **Alineación con la Constitución**: Ratificación del Principio II (prohibición de rechazo o cierre automático) frente al vencimiento de SLA.
   - **Formalización de Gobernanza**: Instrucción de evaluar impacto en la bitácora de `LLMS.docx` y exigir la formalización de `DEC-13` y `DEC-14`.

**Conclusión:** El agente de IA actuó como un redactor técnico de altísima velocidad y rigurosidad formal, mientras que el equipo humano ejerció un control estricto de arquitectura y negocio, impidiendo que supuestos autónomos del modelo alteraran las reglas operativas de la aseguradora.
