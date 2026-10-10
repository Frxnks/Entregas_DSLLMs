# Entrega 1 - Análisis de Requisitos MIRA

**Proyecto:** MIRA, Plataforma Multimodal de Decisiones  
**Empresa:** DPRIME SpA  
**Equipo de Ingeniería:** Dante Chávez, Nikolas Lagos, Franko Moraga y Felipe Carú  
**Fecha de Análisis:** 06-09-2026  
**Representante del Cliente:** Nikolas Lagos  

---

## 1. Propósito y Alcance

Esta entrega analiza el documento de necesidades de MIRA y sus entrevistas con los participantes del negocio. El objetivo es identificar contradicciones, resolverlas desde la perspectiva del cliente y dejar una base trazable para la especificación técnica posterior.

El **alcance** considera las siguientes dimensiones del sistema:
* Ingesta de expedientes y evidencias digitales.
* Evaluación automatizada y revisión humana asistida.
* Configuración de flujos y umbrales.
* Integración con sistemas heredados.
* Seguridad de los datos y plan de entregas.

> **Decisión de Negocio Central:** Iniciar con un MVP de reembolsos médicos basado en documentos e imágenes en **enero de 2027**, y completar las capacidades multimodales (incluyendo audio y video) en **abril de 2027**.

---

## 2. Hallazgos Ejecutivos

1. **Cobro por valor:** El cobro comercial se aplica solo a decisiones automáticas concluyentes; los casos enviados a revisión humana no se cobran como validaciones resueltas.
2. **Cumplimiento y Privacidad:** La operación real del cliente exige retención de evidencia, residencia de datos, anonimización y control humano que no estaban suficientemente reflejados en la propuesta inicial.
3. **Arquitectura y Conectividad:** El sistema debe responder asincrónicamente, integrarse con una carpeta compartida del sistema heredado y ofrecer autenticación federada, en lugar de depender exclusivamente de APIs, procesamiento síncrono y credenciales propias.

---

## 3. Criterios Generales Acordados

* **Validación Facturable:** Es una decisión automática útil, clara y concluyente.
* **Control Humano:** Los casos desfavorables o con señales de fraude no se rechazan automáticamente: pasan a revisión humana.
* **Ciclo de Vida de la Evidencia:** Permanece activa 90 días y luego se conserva cifrada en almacenamiento frío durante 5 años.
* **Soberanía de Datos:** Los datos originales permanecen en Chile. Antes de consultar modelos externos, se enmascaran los datos personales identificables (PII).
* **Rendimiento de Ingesta:** Entrega un acuse `HTTP 202` en menos de 1 segundo; el resultado se notifica posteriormente.
* **Umbrales:** Configurables por flujo y cliente. Para el piloto, el umbral de aprobación automática es de 90 puntos.
* **Integración Híbrida:** Debe soportar API REST y un adaptador para carpeta compartida.
* **Seguridad:** La autenticación preferente para clientes corporativos es SSO federado.

---

## 4. Inconsistencias Detectadas y Respuesta del Cliente

*Todas las resoluciones fueron validadas por Nikolas Lagos en el rol de Representante del Cliente.*

### H-01: Definición de validación facturable
* **Contradicción:** La propuesta habla de resultados útiles, pero una entrevista plantea cobrar también los casos derivados a revisión (Finanzas se opone).
* **Respuesta del Cliente:** Se cobra solo cuando la máquina emite por sí sola una decisión útil y concluyente. El trabajo manual del cliente no debe generar cobro de software.
* **Resolución:** Se factura exclusivamente la decisión automática concluyente. Los casos derivados se registran para métricas operativas, sin cobro unitario.
* **Impacto:** Facturación, definición de validación, requisitos comerciales y backlog.

### H-02: Tramos de volumen tarifario
* **Contradicción:** La tabla inicial termina en 5.000 casos, sin definir precio para operaciones mayores.
* **Respuesta del Cliente:** El área médica procesa ~12.000 casos y >40.000 documentos al mes.
* **Resolución:** La tabla tarifaria debe parametrizarse para soportar volúmenes superiores a 15.000 casos mensuales, con precios definidos por volumen.
* **Impacto:** Modelo comercial, configuración de tarifas y escalabilidad operativa.

### H-03: Retención de evidencia
* **Contradicción:** La propuesta indica eliminar documentos a los 90 días, pero Cumplimiento exige conservarlos por 5 a 10 años.
* **Respuesta del Cliente:** Evidencia rápida por 3 meses, luego archivo histórico seguro por 5 años.
* **Resolución:** Mantener 90 días en almacenamiento activo y luego migrar evidencia cifrada a almacenamiento frío hasta completar 5 años.
* **Impacto:** Retención, almacenamiento por capas, auditoría y prueba de recuperación.

### H-04: Rechazo automático
* **Contradicción:** El documento permite rechazos automáticos por puntaje bajo, práctica prohibida por Cumplimiento.
* **Respuesta del Cliente:** Ningún reembolso se rechaza automáticamente. Requiere firma y revisión de liquidador.
* **Resolución:** MIRA no emite rechazos automáticos. Todo caso desfavorable/sospechoso pasa a revisión asistida con prioridad alta.
* **Impacto:** Motor de decisiones, bandeja de revisión, auditoría y derechos del asegurado.

### H-05: Borrado de PII e inalterabilidad
* **Contradicción:** Exigencia de auditoría inalterable vs. derecho a eliminación de datos personales.
* **Respuesta del Cliente:** Eliminar RUT y nombre, pero conservar el historial técnico de evaluación.
* **Resolución:** Se anonimiza la identidad del titular y se conserva la traza técnica inalterable.
* **Impacto:** Privacidad, auditoría, anonimización y pruebas de borrado.

### H-06: Residencia territorial de datos
* **Contradicción:** Arquitectura con modelos extranjeros sin controles explícitos para PII.
* **Respuesta del Cliente:** Datos originales en Chile. Solo fragmentos sin nombres/RUT pueden salir.
* **Resolución:** Almacenamiento local de evidencia. Un módulo local enmascara la PII antes del envío a modelos externos.
* **Impacto:** Arquitectura de seguridad, privacidad, residencia de datos.

### H-07: Tiempo de procesamiento
* **Contradicción:** Exigencia de respuesta síncrona en < 5 segundos vs. peso real de expedientes multimodales.
* **Respuesta del Cliente:** Se necesita comprobante inmediato y notificación posterior (procesar video en 5s no es realista).
* **Resolución:** API responde `HTTP 202` en < 1 segundo; procesamiento asíncrono vía eventos o webhooks.
* **Impacto:** API de ingesta, colas, notificaciones, idempotencia.

### H-08: Integración con sistema heredado
* **Contradicción:** Propuesta asume API REST exclusiva, pero el sistema central (22 años de antigüedad) usa carpetas compartidas.
* **Respuesta del Cliente:** No se debe exigir modernización del sistema central.
* **Resolución:** Desarrollar un adaptador desacoplado que monitorea la carpeta, transforma archivos y los entrega a MIRA.
* **Impacto:** Ingesta, conector de carpeta, CU-01.

### H-09: Autenticación duplicada
* **Contradicción:** MIRA propone credenciales propias; el cliente exige federación corporativa.
* **Respuesta del Cliente:** No se administrará una clave adicional.
* **Resolución:** Implementar autenticación federada mediante SSO (SAML/OAuth2).
* **Impacto:** Seguridad, gestión de usuarios, roles.

### H-10: Fechas de entrega
* **Contradicción:** Plan original ubica producción completa en abril, pero comercial exige operar en enero.
* **Respuesta del Cliente:** Operar con casos médicos reales (docs/imágenes) en enero; audio/video en abril.
* **Resolución:** Adelantar un MVP médico para enero de 2027 y mantener entrega multimodal para abril de 2027.
* **Impacto:** Alcance, backlog, planificación (MoSCoW).

---

## 5. Bitácora de Decisiones

Las siguientes decisiones formalizan la resolución de las inconsistencias desde el rol de Representante del Cliente, sentando las bases estáticas para el diseño del sistema.

| ID | Decisión | Justificación | Impacto Principal |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Cobrar solo decisiones automáticas concluyentes. | Respeta la propuesta comercial y evita disputas de facturación. | Facturación, validación, backlog |
| **DEC-02** | Conservar evidencia 90 días activa y 5 años en frío cifrada. | Cumple exigencia regulatoria sin sobrecargar almacenamiento activo. | RQNF-004, retención |
| **DEC-03** | Prohibir rechazos automáticos; derivar a revisión. | Protege derechos del asegurado y cumple restricción legal. | RQF-008, CU-02 |
| **DEC-04** | Ingesta asíncrona (`HTTP 202`) y notificación. | Evita bloqueos y reintentos en expedientes pesados. | RQNF-001, SSD |
| **DEC-05** | Anonimizar PII y conservar traza técnica de auditoría. | Reconcilia privacidad con inalterabilidad. | RQF-019, auditoría |
| **DEC-06** | Datos en Chile y enmascaramiento de PII. | Cumple la residencia territorial de los datos. | RQNF-006, arquitectura |
| **DEC-07** | Umbrales configurables (Piloto: 90 puntos). | Permite ajustar el apetito de riesgo del cliente. | RQF-006, flujos |
| **DEC-08** | Incorporar adaptador para carpeta compartida. | Integra sistema heredado sin necesidad de reemplazarlo. | RQF-012, CU-01 |
| **DEC-09** | Priorizar autenticación federada SSO. | Evita credenciales duplicadas y cumple ciberseguridad corporativa. | RQF-020, seguridad |
| **DEC-10** | Lanzar MVP médico (Enero) y multimodal (Abril). | Cumple hito comercial sin forzar una entrega inestable. | Backlog, roadmap |

> ⚠️ **Observación de Trazabilidad:** En el material fuente preliminar, `H-02` aparece rotulado ocasionalmente con `DEC-02`, pero el contenido de `DEC-02` corresponde a `H-03` (retención de evidencia). Asimismo, `H-07` se relaciona con `DEC-04` por el procesamiento asíncrono, mientras `DEC-07` corresponde a la configuración de umbrales. *Esta observación queda documentada para mantener la coherencia en las referencias cruzadas de los artefactos técnicos.*

---

## 6. Resultado Esperado para las Siguientes Fases

Este documento cierra formalmente la fase de Análisis (Paso 1). Las siguientes etapas de la cascada de desarrollo deberán consumir estas decisiones en los artefactos correspondientes:

* **Paso 2 (Diseño y Especificación):** Conversión de decisiones en modelo de dominio, casos de uso (CU), requisitos funcionales y no funcionales (RQF/RQNF), pruebas, backlog con DoD y diagramas SSD.
* **Paso 3 (Ingeniería de Prompts):** Documentación de las técnicas de prompting y anexado de los prompts utilizados para las interacciones con los modelos del sistema.
