<!--
Sync Impact Report:
- Version change: 1.2.0 -> 2.0.0
- Bump rationale: Reconstrucción integral de la constitución para anclar y alinear estrictamente las directrices del proyecto con las decisiones documentadas (DEC-01 a DEC-12) en LLMS.docx, conservando únicamente los marcadores de decisión [DEC-XX] para la trazabilidad y preservando el español como principio base no negociable.
- Principles:
  - I. Idioma Oficial Estricto en Español (NON-NEGOTIABLE)
  - II. Control Humano y Prohibición de Rechazo Automático (NON-NEGOTIABLE) [DEC-04]
  - III. Soberanía Territorial de Datos y Enmascaramiento de PII (NON-NEGOTIABLE) [DEC-06]
  - IV. Reconciliación de Inalterabilidad y Derecho de Supresión en Auditoría (NON-NEGOTIABLE) [DEC-05]
  - V. Validación Comercial por Decisión Automática Concluyente [DEC-01]
  - VI. Retención de Evidencia por Capas [DEC-03]
- Added sections:
  - Planificación y Estrategia de Entregas [DEC-10]
- Modified sections:
  - Restricciones Arquitecturales y Estándares de Integración [DEC-02, DEC-07, DEC-08, DEC-09, DEC-11, DEC-12]
- Removed sections:
  - Metodología de Ingeniería, Técnicas de Prompting y Definición de Terminado (DoD) general sin respaldo en decisiones DEC-XX.
- Follow-up TODOs: Ninguno.
-->

# MIRA Constitution

## Core Principles

### I. Idioma Oficial Estricto en Español (NON-NEGOTIABLE)
Todas las interacciones, requerimientos, especificaciones (`spec.md`), planes (`plan.md`), desgloses de tareas (`tasks.md`), bitácoras y artefactos de documentación técnica DEBEN redactarse e interactuar estrictamente en idioma español. Queda prohibido el uso de otros idiomas en la comunicación, consultas y artefactos generados por agentes o colaboradores del proyecto, salvo identificadores técnicos de código fuente, estándares internacionales o nombres propios indispensables.
**Razón/Justificación**: Garantizar la comprensión unívoca, la consistencia operativa y la alineación directa entre el equipo de ingeniería y los representantes del cliente.

### II. Control Humano y Prohibición de Rechazo Automático (NON-NEGOTIABLE) [DEC-04]
El sistema NUNCA DEBE emitir rechazos 100% automáticos sobre casos de personas [DEC-04]. Todo caso cuyo puntaje sea inferior al umbral de aprobación automática configurado o que presente señales de alerta o fraude activas DEBE derivarse obligatoriamente a la bandeja de revisión asistida para evaluación y resolución por parte de un operador humano calificado (liquidador) [DEC-04]. Jamás podrá quedar un caso rechazado sin intervención humana resolutiva.
**Razón/Justificación**: Cumplimiento de la normativa imperativa de protección de datos personales sobre decisiones automatizadas desfavorables y resguardo de las garantías legales del asegurado [DEC-04].

### III. Soberanía Territorial de Datos y Enmascaramiento de PII (NON-NEGOTIABLE) [DEC-06]
La evidencia y los datos de clientes chilenos DEBEN residir exclusivamente en servidores ubicados dentro del territorio nacional [DEC-06]. Antes de invocar o consultar modelos de lenguaje o visión externos alojados en el extranjero (EE. UU. o Europa), un módulo local DEBE remover o enmascarar estrictamente todos los datos de identificación personal (PII, incluyendo RUT, nombres completos y datos sensibles) [DEC-06].
**Razón/Justificación**: Garantizar la soberanía de los datos, el secreto comercial y el cumplimiento de las restricciones legales sobre transferencia internacional de información confidencial, habilitando al mismo tiempo el uso seguro de modelos de frontera [DEC-06].

### IV. Reconciliación de Inalterabilidad y Derecho de Supresión en Auditoría (NON-NEGOTIABLE) [DEC-05]
Ante el ejercicio legítimo del derecho de supresión de datos personales por parte de un titular, el sistema DEBE anonimizar o disociar los datos identificatorios (PII como RUT y nombre), preservando íntegra e inalterable la traza técnica y el registro de auditoría del caso [DEC-05]. Ningún perfil, incluido el administrador, puede destruir ni modificar el historial técnico de las transacciones [DEC-05].
**Razón/Justificación**: Reconcilia el derecho al olvido y la privacidad de los usuarios con las exigencias regulatorias y legales de inalterabilidad y auditabilidad retrospectiva del sistema [DEC-05].

### V. Validación Comercial por Decisión Automática Concluyente [DEC-01]
La plataforma DEBE contabilizar y facturar comercialmente única y exclusivamente aquellas validaciones en las que el sistema emita por sí solo una resolución automática útil y concluyente en producción [DEC-01]. Los casos derivados a revisión asistida por un operador humano no constituyen validaciones facturables y DEBEN registrarse únicamente con fines de métricas de capacidad operativa, sin generar cobro unitario de software [DEC-01].
**Razón/Justificación**: Respeto riguroso a la propuesta comercial formalizada y prevención de controversias contractuales o discrepancias de facturación con la aseguradora [DEC-01].

### VI. Retención de Evidencia por Capas [DEC-03]
Toda la evidencia digital y documentación de respaldo de los casos DEBE conservarse cifrada durante 90 días en almacenamiento activo, y migrar de manera automatizada a almacenamiento frío (*cold storage*) hasta completar un periodo de retención legal de 5 años [DEC-03].
**Razón/Justificación**: Cumplimiento estricto de las exigencias regulatorias del mercado asegurador (SVS/CMF) sin encarecer la infraestructura de almacenamiento activo de alta disponibilidad [DEC-03].

## Restricciones Arquitecturales y Estándares de Integración

- **Ingesta Asíncrona por Eventos [DEC-07]**: La API de ingesta DEBE emitir un acuse de recibo asincrónico (`HTTP 202`) en menos de 1 segundo asignando un identificador de caso único [DEC-07]. El procesamiento de los expedientes pesados DEBE realizarse de forma asíncrona mediante colas de mensajería, notificando el veredicto final vía webhooks o eventos al sistema de origen para evitar bloqueos y tiempos de espera desbordados [DEC-07].
- **Escalabilidad de Capacidad y Tramos de Volumen [DEC-02]**: La plataforma DEBE incorporar estructuras de configuración de tramos tarifarios y capacidad técnica de carga sostenida diseñadas para procesar volúmenes superiores a 15.000 casos mensuales por organización sin degradación del servicio [DEC-02].
- **Adaptador de Integración para Sistemas Heredados [DEC-08]**: La arquitectura DEBE proveer un módulo conector adaptador desacoplado para la lectura y escritura de archivos en carpetas compartidas del cliente [DEC-08]. Esto permite interoperar con sistemas centrales (*core*) heredados (legacy) sin exigir adaptaciones costosas en la infraestructura del cliente [DEC-08].
- **Autenticación Federada Corporativa (SSO) [DEC-09]**: El acceso de usuarios corporativos DEBE operar preferentemente mediante autenticación federada (SSO/SAML/OAuth2) delegada en el directorio corporativo del cliente, impidiendo la duplicidad y administración de contraseñas locales en MIRA [DEC-09].
- **Parametrización y Calibración de Umbrales [DEC-11]**: Los umbrales de decisión no deben codificarse de forma fija en la plataforma; DEBEN ser parametrizables y configurables por el Administrador de Riesgo para cada flujo y organización [DEC-11]. Para el inicio de la marcha blanca, el umbral de aprobación automática DEBE establecerse en 90 puntos [DEC-11].
- **Consulta Activa de Estado (Pull) [DEC-12]**: La plataforma DEBE exponer un endpoint de consulta de estado por identificador de caso (`idCaso`) complementario e independiente del mecanismo de webhook/callback [DEC-12], funcionando como salvaguarda ante fallos de entrega o pérdidas de eventos en redes de sistemas clientes heredados [DEC-12].

## Planificación y Estrategia de Entregas

- **Despliegue Progresivo y MVP Acotado [DEC-10]**: La estrategia de desarrollo y despliegue DEBE estructurarse en fases [DEC-10]. Se DEBE priorizar un MVP simplificado para operar con casos reales en enero de 2027 enfocado en reembolsos médicos (documentos e imágenes), difiriendo la entrega de la suite multimodal completa (que incorpora análisis de audio y video) para abril de 2027 [DEC-10].

## Governance

- **Supremacía Constitucional**: La presente constitución rige de manera obligatoria y tiene jerarquía suprema sobre cualquier otra especificación preliminar, diseño técnico o convención informal. Ningún artefacto (`spec.md`, `plan.md`, `tasks.md`), componente de software o Pull Request puede vulnerar sus principios o decisiones.
- **Procedimiento Formal de Enmiendas**: Cualquier modificación, derogación o ampliación de esta constitución DEBE formalizarse explícitamente mediante un proceso de enmienda, estar respaldada por una decisión validada con el Representante del Cliente y mantener la trazabilidad inequívoca de la decisión correspondiente `[DEC-XX]`.
- **Política de Versionado (SemVer)**:
  - **MAJOR (X.0.0)**: Cambios incompatibles en gobernanza, eliminación o redefinición de principios fundamentales no negociables.
  - **MINOR (x.Y.0)**: Incorporación de nuevos principios, estándares arquitecturales o decisiones de diseño.
  - **PATCH (x.y.Z)**: Clarificaciones de redacción, corrección de erratas o ajustes menores de estilo.
- **Revisiones de Cumplimiento**: Todo plan de especificación, arquitectura, desglose de tareas y Pull Request DEBE someterse a verificación de conformidad estricta contra esta constitución. Cualquier conflicto no resuelto o desviación no documentada constituirá un bloqueo crítico (CRITICAL).

**Version**: 2.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-16
