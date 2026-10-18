# Manual de Referencia Técnica: API de Scoring y Motor de Reglas de Negocio (MIRA F4)

**Documento**: Manual de Especificación y Contratos de Integración de API  
**Módulo**: F4 - Puntaje de Confianza, Precedencia de Fraude y Decisión por Umbrales  
**Versión**: 1.0.0  
**Fecha de Emisión**: Octubre 2026  
**Audiencia**: Ingenieros de Software, Arquitectos de Soluciones, Analistas de Riesgo y Oficiales de Cumplimiento Regulatorio  
**Garantía de Rendimiento**: Latencia de respuesta en endpoints < 1.000 ms (RQNF-001 / PX-01) y disponibilidad 99,9% (RQNF-006 / PX-06)  

---

## 1. Resumen Ejecutivo y Arquitectura del Sistema

La **Plataforma MIRA** (*Modelo Inteligente de Revisión Asistida*) opera como el núcleo algorítmico de evaluación automatizada para liquidaciones y reembolsos de gastos médicos complementarios en la industria aseguradora chilena.

El módulo **F4 (`ScoringModule`)** implementa la lógica de cálculo ponderado de confiabilidad, la evaluación de umbrales parametrizables y la aplicación de reglas de negocio resolutivas bajo una estricta jerarquía de precedencia. Su diseño garantiza soberanía de datos personales (PII), auditabilidad inalterable de auditoría regulatoria y desacoplamiento asincrónico respecto a la bandeja de resolución humana **F1 (`ReviewTrayModule`)**.

```
+----------------------------------------------------------------------------------------------------+
|                                    ARQUITECTURA MODULAR MIRA (F4)                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  Cliente / Core Asegurador                         MIRA Scoring Module (NestJS)                    |
|  +------------------------+                     +------------------------------------------------+ |
|  | Solicitud Liquidación  |                     |  ScoringController                             | |
|  | - idCaso, idFlujo      |                     |  - POST /api/v1/scoring/evaluate               | |
|  | - Señales Analizadas   |                     |  - GET  /api/v1/scoring/cases/:id/breakdown    | |
|  | - PII Sanitizado       |                     |  - GET/PUT /api/v1/scoring/thresholds/:id      | |
|  +-----------+------------+                     +-----------------------+------------------------+ |
|              |                                                          |                          |
|              v (POST /evaluate)                                         v                          |
|  +-----------------------------------------------------------------------------------------------+ |
|  |  ScoringEngineService                                                                         | |
|  |  * Normalización ponderada a escala 0-100 (RQF-004)                                           | |
|  |  * Generación de desglose explicativo y mapeo de coordenadas espaciales (Bounding Boxes)     | |
|  |  * Cómputo de SLA en días hábiles chilenos (ChileanCalendarUtil)                              | |
|  +----------------------------------------------+------------------------------------------------+ |
|                                                 |                                                  |
|                                                 v                                                  |
|  +-----------------------------------------------------------------------------------------------+ |
|  |  DecisionRulesService (Jerarquía Estricta de Decisión)                                        | |
|  |  1º Nivel: Precedencia Absoluta de Fraude (DEC-04 / RQF-023)                                  | |
|  |  2º Nivel: Mínimos Basales por Señal >= 60 pts (RQF-022)                                        | |
|  |  3º Nivel: Umbral Global de Aprobación >= 90 pts (DEC-11 / DEC-01)                              | |
|  +----------------------------------------------+------------------------------------------------+ |
|                                                 |                                                  |
|                      +--------------------------+--------------------------+                       |
|                      | APROBADO_AUTOMATICO                                 | DERIVADO                      |
|                      v (Facturable = true)                                 v (Facturable = false)          |
|  +---------------------------------------------+   +---------------------------------------------+ |
|  |  Persistencia Caso: RESUELTO                |   |  Persistencia Caso: PENDIENTE_REVISION      | |
|  |  - No ingresa a bandeja humana (DEC-01)     |   |  - Ingresa a Bandeja F1 (/bandeja)          | |
|  |  - Facturación comercial devengada          |   |  - Control Humano Efectivo (DEC-04)         | |
|  +---------------------------------------------+   +---------------------------------------------+ |
|                                                                                                    |
|  Capa de Persistencia e Integridad (PostgreSQL + Prisma ORM)                                       |
|  +-----------------------------------------------------------------------------------------------+ |
|  |  * PrismaService: Middleware append-only en tablas 'decisiones' y 'auditorias_umbral'        | |
|  |  * PiiMaskingService: Enmascaramiento irreversible de RUTs y Nombres en tránsito              | |
|  +-----------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Jerarquía Estricta de Decisión y Reglas de Negocio

La adjudicación de veredictos en MIRA no se basa en heurísticas probabilísticas opacas ni en decisiones monolíticas de caja negra. El motor aplica un **árbol de decisión jerárquico determinista de 3 niveles descendentes**, donde el nivel superior invalida cualquier condición favorable del nivel inferior:

```
                                  [ Inicio: Evaluación del Caso ]
                                                 |
                                                 v
                               +-----------------------------------+
                               | 1º NIVEL: ¿Alerta de Fraude en    |
                               |    alguna señal analizada?        |
                               +-----------------+-----------------+
                                                 |
                                  SI             |            NO
                     +---------------------------+             |
                     v                                         v
       +----------------------------+        +-----------------------------------+
       | Veredicto:                 |        | 2º NIVEL: ¿Alguna señal reprueba  |
       | DERIVADO_REVISION_ASISTIDA |        |    su umbral mínimo (< 60 pts)?   |
       | Causal: FRAUDE             |        +-----------------+-----------------+
       | Sugerencia: RECHAZAR       |                          |
       | Prioridad: ALTA            |             SI           |            NO
       | Facturable: FALSE (DEC-01) |    +---------------------+             |
       +----------------------------+    v                                   v
                           +----------------------------+        +-----------------------------------+
                           | Veredicto:                 |        | 3º NIVEL: ¿Puntaje global         |
                           | DERIVADO_REVISION_ASISTIDA |        |    ponderado >= Umbral (90 pts)?  |
                           | Causal: MINIMO_SENAL       |        +-----------------+-----------------+
                           | Sugerencia: APROBAR        |                          |
                           | Prioridad: MEDIA           |             SI           |            NO
                           | Facturable: FALSE (DEC-01) |    +---------------------+             |
                           +----------------------------+    v                                   v
                                              +----------------------------+   +----------------------------+
                                              | Veredicto:                 |   | Veredicto:                 |
                                              | APROBADO_AUTOMATICO        |   | DERIVADO_REVISION_ASISTIDA |
                                              | Causal: NINGUNA            |   | Causal: PUNTAJE_INSUF.     |
                                              | Sugerencia: APROBAR        |   | Sugerencia: APROBAR        |
                                              | Prioridad: BAJA            |   | Prioridad: MEDIA           |
                                              | Facturable: TRUE (DEC-01)  |   | Facturable: FALSE (DEC-01) |
                                              +----------------------------+   +----------------------------+
```

### 2.1. Nivel 1: Precedencia Absoluta de Fraude (DEC-04 / RQF-023)
* **Principio**: La seguridad financiera y la detección de ilícitos documentales prevalecen categóricamente sobre cualquier cálculo numérico ponderado.
* **Mecanismo**: Si una o más señales tienen marcado el atributo `esAlertaFraude = true` (por ejemplo, detección forense de adulteración de folios, boletas reimpresas de otras pólizas o clonación digital):
  1. La aprobación automática queda **terminantemente bloqueada**, incluso si el puntaje ponderado global es 95 o 100 puntos.
  2. El veredicto forzado es `DERIVADO_REVISION_ASISTIDA`.
  3. La causal se clasifica como `FRAUDE`.
  4. La sugerencia de MIRA al liquidador se establece en `RECHAZAR`.
  5. El nivel de prioridad asignado es `ALTA`.
  6. El caso se marca como **no facturable** (`esFacturable = false`).

### 2.2. Nivel 2: Mínimos Basales por Señal (RQF-022)
* **Principio**: Ningún siniestro puede aprobarse de forma autónoma si presenta fallas graves en dimensiones críticas individuales, impidiendo que una dimensión con puntaje perfecto compense la debilidad de otra.
* **Mecanismo**: Si ninguna señal reporta fraude, pero una o más señales presentan un puntaje inferior a su umbral mínimo específico o al mínimo basal de seguridad del flujo (60 puntos en el estándar MVP):
  1. Se suspende la aprobación automática aunque el promedio ponderado supere los 90 puntos.
  2. El caso transiciona a `DERIVADO_REVISION_ASISTIDA`.
  3. La causal se establece en `MINIMO_SENAL`.
  4. La sugerencia se mantiene en `APROBAR` para que el liquidador evalúe si la deficiencia es subsanable.
  5. El nivel de prioridad es `MEDIA`.
  6. No se devengan honorarios de facturación (`esFacturable = false`).

### 2.3. Nivel 3: Umbral Global de Aprobación Automática (DEC-11 / DEC-01)
* **Puntaje $\ge$ Umbral (ej. $\ge$ 90 puntos)**:
  * El caso cumple holgadamente con los estándares de autenticidad, consistencia clínica y coherencia de montos.
  * Transiciona al estado `APROBADO_AUTOMATICO` con causal `NINGUNA`.
  * **No ingresa** a la bandeja de revisión humana, agilizando la transferencia bancaria al asegurado.
  * Se devenga como validación exitosa sujeta a cobro comercial (`esFacturable = true`).
* **Puntaje $<$ Umbral (ej. $<$ 90 puntos)**:
  * **Prohibición Constitucional de Rechazo Automático (DEC-04 / RQF-007)**: La plataforma **jamás** emite una resolución adversa o de rechazo de forma algorítmica unilateral.
  * Se transiciona el siniestro a `DERIVADO_REVISION_ASISTIDA` con causal `PUNTAJE_INSUFICIENTE`.
  * La sugerencia orientativa de MIRA es `APROBAR` (Human-in-the-Loop), permitiendo que el analista profesional decida la pertinencia de la cobertura.
  * Se genera automáticamente un plazo de compromiso de servicio (SLA) de 3 días hábiles chilenos.
  * No constituye hecho facturable (`esFacturable = false`).

---

## 3. Modelo y Reglas de Facturación Comercial (DEC-01 / RQF-015)

Para alinear los incentivos tecnológicos con los objetivos de eficiencia operativa de las compañías aseguradoras, MIRA opera bajo el principio comercial de **Facturación Exclusiva por Autonomía Concluyente**:

| Estado de Decisión | Causal | Intervención Humana | ¿Facturable? | Fundamento Económico y Operativo |
| :--- | :--- | :--- | :--- | :--- |
| `APROBADO_AUTOMATICO` | `NINGUNA` | **Ninguna (0 min)** | **SÍ (`true`)** | El cliente asegurador obtiene ahorro operativo tangible: el caso se resuelve de forma inmediata, sin consumo de horas analista. |
| `DERIVADO_REVISION_ASISTIDA` | `PUNTAJE_INSUFICIENTE` | Requerida en Bandeja F1 | **NO (`false`)** | El cliente debe disponer del tiempo de sus liquidadores para resolver la incertidumbre documental. |
| `DERIVADO_REVISION_ASISTIDA` | `FRAUDE` | Requerida en Bandeja F1 | **NO (`false`)** | La confirmación del fraude y eventual rechazo legal requiere la firma formal de un analista humano. |
| `DERIVADO_REVISION_ASISTIDA` | `MINIMO_SENAL` | Requerida en Bandeja F1 | **NO (`false`)** | Requiere cotejo puntual de la evidencia física o contacto con el prestador médico. |

> **Garantía Contractual**: El campo booleano `esFacturable` es computado directamente por el motor en servidor de forma determinista y se expone tanto en las respuestas API como en los registros persistidos de auditoría contable.

---

## 4. Contratos de API REST (OpenAPI 3.0.3)

Todos los endpoints se encuentran prefijados bajo la ruta `/api/v1/scoring` y operan con intercambio exclusivo de datos en formato JSON (`application/json`).

### 4.1. Evaluación de Caso y Determinación de Veredicto
* **Ruta**: `POST /api/v1/scoring/evaluate`
* **Código de Éxito**: `200 OK`
* **Descripción**: Evalúa un conjunto de señales precalculadas de un caso contra los umbrales vigentes del flujo, calcula el puntaje ponderado, aplica la jerarquía de decisión y opcionalmente persiste o actualiza el registro en la base de datos PostgreSQL.

#### Esquema de Solicitud (`EvaluateCaseRequestDto`)
```json
{
  "idCaso": "CASO-SEED-001",
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "senales": [
    {
      "tipoSenal": "CONSISTENCIA_MONTOS",
      "moduloOrigen": "lector_v1",
      "puntaje": 95.0,
      "pesoPonderacion": 0.5,
      "umbralMinimo": 60.0,
      "esAlertaFraude": false,
      "descripcion": "Totales cuadran íntegramente con boleta emitida",
      "ubicacionHallazgo": {
        "page": 1,
        "x": 100,
        "y": 200,
        "width": 300,
        "height": 50
      }
    },
    {
      "tipoSenal": "AUTENTICIDAD_DOCUMENTAL",
      "moduloOrigen": "lector_v1",
      "puntaje": 93.0,
      "pesoPonderacion": 0.5,
      "umbralMinimo": 60.0,
      "esAlertaFraude": false,
      "descripcion": "Documento íntegro sin artefactos de manipulación digital"
    }
  ],
  "persistir": true
}
```

#### Esquema de Respuesta Exitosa (`EvaluationResultResponseDto`)
```json
{
  "idCaso": "CASO-SEED-001",
  "puntajeConfianza": 94.0,
  "estadoDecision": "APROBADO_AUTOMATICO",
  "sugerenciaMIRA": "APROBAR",
  "causalDerivacion": "NINGUNA",
  "razonDerivacion": "Puntaje de confianza sobresaliente (94/100) que supera o iguala el umbral de aprobación de 90 puntos sin discrepancias ni señales adversas.",
  "esFacturable": true,
  "fechaVencimientoSLA": "2026-10-22T14:30:00.000Z",
  "nivelPrioridad": "BAJA"
}
```

---

### 4.2. Consulta de Desglose Analítico de Señales
* **Ruta**: `GET /api/v1/scoring/cases/:idCaso/breakdown`
* **Código de Éxito**: `200 OK`
* **Descripción**: Retorna la estructura analítica explicativa de cada dimensión, indicando ponderación, cumplimiento de umbral basal y presencia de alertas de fraude. Permite al liquidador en la Bandeja F1 entender con precisión el raciocinio del sistema sin sesgos de opacidad algorítmica.

#### Esquema de Respuesta (`CaseBreakdownResponseDto`)
```json
{
  "idCaso": "CASO-SEED-002",
  "puntajeConfianza": 74.0,
  "umbralAprobacion": 90.0,
  "alertaFraudeActiva": false,
  "senales": [
    {
      "tipoSenal": "CONSISTENCIA_MONTOS",
      "moduloOrigen": "lector_v1",
      "puntaje": 83.0,
      "pesoPonderacion": 0.65,
      "umbralMinimo": 60.0,
      "cumpleMinimo": true,
      "esAlertaFraude": false,
      "descripcion": "Discrepancia menor en desglose de copago",
      "ubicacionHallazgo": null
    },
    {
      "tipoSenal": "COHERENCIA_FECHAS",
      "moduloOrigen": "analizador_fechas_v1",
      "puntaje": 65.0,
      "pesoPonderacion": 0.35,
      "umbralMinimo": 60.0,
      "cumpleMinimo": true,
      "esAlertaFraude": false,
      "descripcion": "Desfase temporal de 45 días entre atención y emisión",
      "ubicacionHallazgo": {
        "page": 1,
        "x": 120,
        "y": 450,
        "width": 280,
        "height": 60
      }
    }
  ]
}
```

---

### 4.3. Consulta de Umbrales Vigentes por Flujo
* **Ruta**: `GET /api/v1/scoring/thresholds/:idFlujo`
* **Código de Éxito**: `200 OK`
* **Descripción**: Obtiene la calibración activa de apetito de riesgo para el flujo de liquidación especificado.

#### Esquema de Respuesta (`ThresholdResponseDto`)
```json
{
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "valorAprobacion": 90.0,
  "minimoBasalSeguridad": 60.0,
  "version": 1,
  "fechaActualizacion": "2026-10-17T20:00:00.000Z"
}
```

---

### 4.4. Calibración de Umbrales con Auditoría Inalterable
* **Ruta**: `PUT /api/v1/scoring/thresholds/:idFlujo`
* **Código de Éxito**: `200 OK`
* **Descripción**: Modifica atómicamente el umbral de aprobación o el mínimo basal de seguridad para un flujo, incrementando el número de versión y registrando un asiento inmutable en la tabla de auditoría.

#### Esquema de Solicitud (`UpdateThresholdDto`)
```json
{
  "valorAprobacion": 88.0,
  "minimoBasalSeguridad": 65.0,
  "usuarioModificador": "admin.riesgo@aseguradora.cl"
}
```

#### Esquema de Respuesta (`ThresholdResponseDto`)
```json
{
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "valorAprobacion": 88.0,
  "minimoBasalSeguridad": 65.0,
  "version": 2,
  "fechaActualizacion": "2026-10-18T10:15:30.000Z"
}
```

---

### 4.5. Consulta de Línea de Tiempo de Auditoría de Umbrales
* **Ruta**: `GET /api/v1/scoring/thresholds/:idFlujo/audit`
* **Código de Éxito**: `200 OK`
* **Descripción**: Expone el historial cronológico e inmutable de todas las calibraciones efectuadas en el flujo para fines de supervisión legal y auditoría de la Comisión para el Mercado Financiero (CMF).

#### Esquema de Respuesta
```json
[
  {
    "idAuditoria": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "idFlujo": "flujo-reembolso-gastos-medicos",
    "valorAprobacionAnterior": 90.0,
    "valorAprobacionNuevo": 88.0,
    "minimoBasalAnterior": 60.0,
    "minimoBasalNuevo": 65.0,
    "usuarioModificador": "admin.riesgo@aseguradora.cl",
    "fechaModificacion": "2026-10-18T10:15:30.000Z"
  }
]
```

---

## 5. Principios Constitucionales y Garantías de Integridad (MIRA Constitution)

La arquitectura de MIRA opera bajo cuatro principios constitucionales inviolables exigidos para su adopción institucional:

### Principio I: Control Humano Efectivo (Human-in-the-Loop, DEC-04)
* La inteligencia artificial actúa como perito técnico consultivo, jamás como decisor final adverso.
* Ningún siniestro es rechazado de forma automática.
* Los liquidadores humanos disponen de facultades plenas para confirmar, desestimar o contradecir las sugerencias emitidas por MIRA, registrando formalmente su firma y justificación legal.

### Principio II: Explicabilidad y Razonamiento Transparente (RQF-004 / RQNF-008)
* Toda derivación a revisión humana incluye una justificación en lenguaje natural claro y conciso.
* El desglose analítico expone el peso de cada señal, el cumplimiento de umbrales basales y la delimitación geométrica de hallazgos (`ubicacionHallazgo`) sobre el documento original.

### Principio III: Soberanía Territorial y Protección de Datos Personales (DEC-05, DEC-06, RQNF-003)
* En estricto apego a la Ley N° 19.628 y estándares corporativos de privacidad, todos los datos residen en servidores y volúmenes locales en territorio chileno.
* Queda terminantemente prohibido el egreso de datos personales identificables (RUTs, nombres de titulares, patologías médicas) a modelos o APIs de terceros en la nube externa.
* El servicio `PiiMaskingService` garantiza el enmascaramiento sistemático de RUTs (`12.345.***-*`) y nombres (`J*** P***`), y preserva el hash SHA-256 criptográfico para asegurar la trazabilidad ante solicitudes de derecho de supresión.

### Principio IV: Inalterabilidad Registral Append-Only (DEC-05 / RQNF-005)
* El registro de auditoría es perenne, inviolable e inmutable.
* A nivel de ORM y base de datos, las entidades `Decision` y `AuditoriaUmbral` se encuentran selladas mediante middleware que intercepta y bloquea toda operación `UPDATE` o `DELETE`.
* Ningún usuario del sistema, incluyendo analistas, jefes de operaciones o administradores de base de datos con credenciales de superusuario, puede alterar retroactivamente el registro de una decisión judicial o una modificación de umbral.

---

## 6. Códigos de Error y Respuestas HTTP

| Código HTTP | Significado | Causal Común en Scoring |
| :--- | :--- | :--- |
| **`200 OK`** | Operación Exitosa | Caso evaluado, desglose obtenido o umbral actualizado con auditoría. |
| **`400 Bad Request`** | Solicitud Inválida | Señal con puntaje fuera del rango 0-100, peso negativo o formato de JSON malformado. |
| **`404 Not Found`** | Recurso No Encontrado | El `idCaso` o `idFlujo` especificado no existe en la persistencia del sistema. |
| **`403 Forbidden`** | Operación Inmutable Violada | Intento de modificar o depurar registros protegidos por la política *append-only* (PX-05). |
| **`500 Internal Error`** | Error No Controlado | Anomalía en la conexión a la base de datos o fallo en el subsistema de cómputo. |
