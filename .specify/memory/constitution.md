<!--
Sync Impact Report:
- Version change: 1.2.0 -> 1.2.0
- Bump rationale: Depuración de referencias para conservar exclusivamente las citas canónicas al documento de necesidades antecedidas por '§' (§1, §2.4, §2.6, §2.7, §2.10, §2.11, §2.13, §2.14, §2.15, §3, §4, §5.1, §5.2).
- Principles:
  - I. Idioma Oficial Estricto en Español (NON-NEGOTIABLE) [§1, §3]
  - II. Control Humano y Prohibición de Rechazo Automático (NON-NEGOTIABLE) [§2.6, §2.7]
  - III. Soberanía Territorial de Datos y Anonimización de PII (NON-NEGOTIABLE) [§4, §2.11, §3]
  - IV. Validación Comercial por Decisión Automática Concluyente [§2.14, §3]
  - V. Trazabilidad Inalterable y Retención de Evidencia por Capas [§2.11]
- Sections:
  - Restricciones Arquitecturales y Estándares de Integración [§2.4, §2.10, §2.13, §2.15, §4]
  - Metodología de Ingeniería, Técnicas de Prompting y Definición de Terminado (DoD) [§1, §2.4, §3, §4, §5.1, §5.2]
- Follow-up TODOs: Ninguno.
-->

# MIRA Constitution

## Core Principles

### I. Idioma Oficial Estricto en Español (NON-NEGOTIABLE)
Todas las interacciones, preguntas, respuestas, especificaciones (`spec.md`), planes (`plan.md`), desgloses de tareas (`tasks.md`), bitácoras y artefactos de documentación técnica DEBEN redactarse e interactuar estrictamente en idioma español (§1, §3). Queda prohibido el uso de otros idiomas en la comunicación y artefactos generados por agentes o colaboradores del proyecto, salvo identificadores técnicos de código fuente, estándares internacionales o nombres propios indispensables.
**Razón/Justificación**: Garantizar la comprensión inequívoca, coherencia operativa y alineación directa con el equipo de ingeniería y los representantes del cliente (§1, §3).

### II. Control Humano y Prohibición de Rechazo Automático (NON-NEGOTIABLE)
El sistema NUNCA DEBE emitir rechazos 100% automáticos sobre casos de personas (§2.6). Todo caso con puntaje inferior al umbral de aprobación automática configurado (p. ej. < 90 puntos) o que presente alertas o señales de fraude activas DEBE derivarse obligatoriamente a la bandeja de revisión asistida para evaluación y resolución por un operador humano calificado (liquidador) (§2.7). Jamás podrá quedar un caso rechazado sin intervención humana calificada.
**Razón/Justificación**: Cumplimiento imperativo de la normativa legal de protección de datos personales sobre decisiones automatizadas desfavorables y resguardo de las garantías del asegurado (§2.6).

### III. Soberanía Territorial de Datos y Anonimización de PII (NON-NEGOTIABLE)
Los datos de clientes chilenos DEBEN residir exclusivamente en servidores en territorio nacional (§4). Antes de consultar modelos de lenguaje o servicios externos en el extranjero (EE. UU./Europa), un módulo local DEBE enmascarar o remover estrictamente todos los datos personales identificables (PII, incluyendo RUT, nombres y datos sensibles) (§4). Asimismo, el sistema DEBE permitir el ejercicio del derecho de supresión disociando o anonimizando los datos personales a solicitud del titular sin alterar la traza técnica de auditoría (§2.11, §3).
**Razón/Justificación**: Cumplimiento estricto de las obligaciones contractuales de residencia territorial de datos, normativas de privacidad y directrices de ciberseguridad corporativa (§4, §2.11, §3).

### IV. Validación Comercial por Decisión Automática Concluyente
La plataforma DEBE contabilizar y facturar comercialmente única y exclusivamente aquellas validaciones donde el sistema emita por sí solo una decisión automática útil, clara y concluyente (§2.14, §3). Los casos derivados a revisión asistida por un operador humano no constituyen validaciones facturables y DEBEN registrarse únicamente para métricas operativas sin generar cobro unitario de software (§2.14). La tabla tarifaria debe soportar volúmenes reales escalables a más de 15.000 casos mensuales (§2.14).
**Razón/Justificación**: Respeto al modelo comercial acordado con la aseguradora y prevención de disputas contractuales en los ciclos de facturación (§2.14, §3).

### V. Trazabilidad Inalterable y Retención de Evidencia por Capas
Toda decisión (automática o humana), veredicto, puntaje calculado, desglose de señales, motivo y cambio de umbral DEBE registrarse de manera íntegra e inalterable en un rastro de auditoría no modificable por ningún perfil, incluido el administrador (§2.11). La evidencia digital DEBE conservarse cifrada durante 90 días en almacenamiento activo y migrar a almacenamiento frío (*cold storage*) hasta completar 5 años (§2.11).
**Razón/Justificación**: Cumplimiento con las exigencias regulatorias del mercado asegurador (CMF/SVS), garantizando auditabilidad legal y optimización de costos de infraestructura (§2.11).

## Restricciones Arquitecturales y Estándares de Integración

- **Ingesta Asíncrona e Idempotente**: La API de ingesta DEBE emitir un acuse de recibo asincrónico (`HTTP 202`) en menos de 1 segundo asignando un identificador de caso único y permanente (§4, §2.4), procesando expedientes pesados de forma asíncrona sin bloquear al sistema del cliente y notificando eventos vía callback/webhook (§4).
- **Consulta Activa de Estado (Pull)**: Como salvaguarda ante fallos de notificación en sistemas externos, la plataforma DEBE proveer un endpoint de consulta de estado por identificador de caso independiente del callback (§2.10, §2.15).
- **Integración Híbrida Desacoplada**: La arquitectura DEBE soportar tanto API REST como conectores desacoplados para carpetas compartidas, permitiendo operar con sistemas centrales heredados sin exigir transformaciones en la infraestructura del cliente (§2.4, §2.10).
- **Autenticación Federada SSO**: El acceso corporativo DEBE operar mediante autenticación federada (SSO/SAML/OAuth2) contra el directorio del cliente, evitando credenciales duplicadas locales (§2.13).
- **Umbrales Parametrizables**: Los umbrales de decisión DEBEN ser configurables por flujo y organización mediante perfiles autorizados (umbral de marcha blanca fijado en 90 puntos), preservando un historial inmutable de cambios con autor, fecha y valor anterior (§2.6).

## Metodología de Ingeniería, Técnicas de Prompting y Definición de Terminado (DoD)

- **Técnicas Normativas de Prompting e Interacción Asistida**:
  - *Grounded Prompting*: Toda afirmación de requisitos o reglas debe estar explícitamente anclada a fuentes verificables (§sección).
  - *Structured Output Prompting*: Uso obligatorio de esquemas estructurados para artefactos tabulares (requisitos, pruebas, backlog) para evitar omisiones por fluidez narrativa (§2.4, §3).
  - *Plan-and-Solve Prompting*: Separación mandatoria entre la fase de planificación conceptual y la fase de generación o diseño técnico.
  - *Chain-of-Verification (CoVe)*: Verificación aislada e independiente en turnos separados para validar flujos alternativos, excepciones y consistencia cruzada.
  - *LLM-as-a-Judge*: Evaluación de artefactos contra rúbricas objetivas y verificables.
- **Definición de Terminado (DoD)**:
  1. Revisión de código por pares mediante Pull Request.
  2. Cobertura de pruebas unitarias mínima del 80%.
  3. Ejecución y aprobación de pruebas funcionales asociadas.
  4. Criterios de aceptación validados formalmente por el Representante del Cliente.
  5. Cero datos reales de clientes en entornos de prueba (exclusivamente datos sintéticos o enmascarados) (§4).
  6. Documentación, contratos de interfaz y especificaciones redactados estrictamente en español (§1, §3).
  7. Despliegue en integración sin regresiones en flujos existentes.
- **Estrategia de Entregas y Exclusiones**: El desarrollo DEBE priorizar un MVP médico (documentos e imágenes) para enero de 2027, posponiendo las capacidades multimodales complejas (audio y video) para abril de 2027 (§5.2). Quedan explícitamente fuera de alcance en esta versión la migración de pilotos anteriores, app móvil de captura y facturación electrónica (§5.1).

## Governance

- **Supremacía Constitucional**: La presente constitución tiene autoridad suprema sobre cualquier otra convención, diseño preliminar o instrucción informal (§1, §3). Ningún artefacto, plan o implementación puede contravenir sus principios.
- **Procedimiento Formal de Enmiendas**: Toda modificación o ampliación de esta constitución DEBE documentarse formalmente, estar respaldada por una validación con el Representante del Cliente y mantener el anclaje normativo (§sección).
- **Política de Versionado (SemVer)**:
  - **MAJOR (X.0.0)**: Cambios incompatibles en gobernanza, eliminación o redefinición de principios fundamentales no negociables.
  - **MINOR (x.Y.0)**: Incorporación de nuevos principios, estándares de arquitectura o ampliación sustancial de directrices.
  - **PATCH (x.y.Z)**: Clarificaciones de redacción, corrección de erratas, ajustes de referencias o refinamientos no semánticos.
- **Revisiones de Cumplimiento**: Todo plan de especificación (`spec.md`), plan de implementación (`plan.md`), desglose de tareas (`tasks.md`) y PR DEBE verificar conformidad estricta contra esta constitución. Cualquier conflicto no justificado constituye un bloqueo crítico (CRITICAL).

**Version**: 1.2.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
