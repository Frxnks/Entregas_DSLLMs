# Verificación de F4 por API

**Fecha de ejecución:** 2026-10-18  
**Commit del clon probado:** `a89ae03`  
**Entorno:** Docker Compose aislado `mira-clean3`; API `http://localhost:13021/api/v1`; PostgreSQL del clon separado de la base original.  
**Persistencia de los cuatro escenarios:** `persistir=false`. Después de las solicitudes, la consulta SQL para `idCaso LIKE 'VERIFY-F4-%'` devolvió 0 filas.

## Escenarios de evaluación

Todos los requests se enviaron como `POST /scoring/evaluate`, `Content-Type: application/json`, con `idFlujo` igual a `flujo-reembolso-gastos-medicos`. Los cuerpos y respuestas se registran a continuación.

### A — Puntaje ponderado aprobatorio

**Request:**

```json
{
  "idCaso": "VERIFY-F4-A-REPEAT",
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "persistir": false,
  "senales": [
    {
      "tipoSenal": "SENAL_A",
      "moduloOrigen": "verify_f4",
      "puntaje": 95,
      "pesoPonderacion": 0.5,
      "umbralMinimo": 60,
      "esAlertaFraude": false,
      "descripcion": "A signal 1"
    },
    {
      "tipoSenal": "SENAL_B",
      "moduloOrigen": "verify_f4",
      "puntaje": 93,
      "pesoPonderacion": 0.5,
      "umbralMinimo": 60,
      "esAlertaFraude": false,
      "descripcion": "A signal 2"
    }
  ]
}
```

**Respuesta real:**

```json
{
  "idCaso": "VERIFY-F4-A-REPEAT",
  "puntajeConfianza": 94,
  "estadoDecision": "APROBADO_AUTOMATICO",
  "sugerenciaMIRA": "APROBAR",
  "causalDerivacion": "NINGUNA",
  "razonDerivacion": "Puntaje de confianza sobresaliente (94/100) que supera o iguala el umbral de aprobación de 90 puntos sin discrepancias ni señales adversas.",
  "esFacturable": true,
  "fechaVencimientoSLA": "2026-10-21T21:41:06.288Z",
  "nivelPrioridad": "BAJA"
}
```

**Veredicto: cumple.** El puntaje es 94 y la decisión es `APROBADO_AUTOMATICO`; no hay estado de rechazo automático.

### B — Alerta de fraude con puntaje 99

**Request:**

```json
{
  "idCaso": "VERIFY-F4-B-REPEAT",
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "persistir": false,
  "senales": [
    {
      "tipoSenal": "SENAL_FRAUDE",
      "moduloOrigen": "verify_f4",
      "puntaje": 99,
      "pesoPonderacion": 1,
      "umbralMinimo": 60,
      "esAlertaFraude": true,
      "descripcion": "Fraud signal"
    }
  ]
}
```

**Respuesta real:**

```json
{
  "idCaso": "VERIFY-F4-B-REPEAT",
  "puntajeConfianza": 99,
  "estadoDecision": "DERIVADO_REVISION_ASISTIDA",
  "sugerenciaMIRA": "RECHAZAR",
  "causalDerivacion": "FRAUDE",
  "razonDerivacion": "Alerta de fraude activa: Fraud signal. Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023).",
  "esFacturable": false,
  "fechaVencimientoSLA": "2026-10-21T21:41:06.353Z",
  "nivelPrioridad": "ALTA"
}
```

**Veredicto: cumple.** La señal de fraude prevalece y el caso se deriva a revisión humana, sin rechazo automático. `sugerenciaMIRA: RECHAZAR` es una sugerencia, no el estado de decisión.

### C — Puntaje global alto, una señal bajo su mínimo

**Request:**

```json
{
  "idCaso": "VERIFY-F4-C-REPEAT",
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "persistir": false,
  "senales": [
    {
      "tipoSenal": "SENAL_ALTA",
      "moduloOrigen": "verify_f4",
      "puntaje": 99,
      "pesoPonderacion": 0.95,
      "umbralMinimo": 60,
      "esAlertaFraude": false,
      "descripcion": "Above minimum"
    },
    {
      "tipoSenal": "SENAL_BAJA",
      "moduloOrigen": "verify_f4",
      "puntaje": 55,
      "pesoPonderacion": 0.05,
      "umbralMinimo": 60,
      "esAlertaFraude": false,
      "descripcion": "Below minimum"
    }
  ]
}
```

**Respuesta real:**

```json
{
  "idCaso": "VERIFY-F4-C-REPEAT",
  "puntajeConfianza": 96.8,
  "estadoDecision": "DERIVADO_REVISION_ASISTIDA",
  "sugerenciaMIRA": "APROBAR",
  "causalDerivacion": "MINIMO_SENAL",
  "razonDerivacion": "Puntaje global suficiente (96.8/100) pero una o más señales individuales reprueban su umbral mínimo configurado: SENAL_BAJA (55 < mín. 60). Derivado a revisión asistida conforme a RQF-022.",
  "esFacturable": false,
  "fechaVencimientoSLA": "2026-10-21T21:41:06.364Z",
  "nivelPrioridad": "MEDIA"
}
```

**Veredicto: cumple.** Aunque el puntaje global supera el umbral, el mínimo individual prevalece y deriva el caso. No hay rechazo automático.

### D — Puntaje bajo el umbral, sin fraude

**Request:**

```json
{
  "idCaso": "VERIFY-F4-D-REPEAT",
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "persistir": false,
  "senales": [
    {
      "tipoSenal": "SENAL_BAJA",
      "moduloOrigen": "verify_f4",
      "puntaje": 80,
      "pesoPonderacion": 1,
      "umbralMinimo": 60,
      "esAlertaFraude": false,
      "descripcion": "Below global threshold"
    }
  ]
}
```

**Respuesta real:**

```json
{
  "idCaso": "VERIFY-F4-D-REPEAT",
  "puntajeConfianza": 80,
  "estadoDecision": "DERIVADO_REVISION_ASISTIDA",
  "sugerenciaMIRA": "APROBAR",
  "causalDerivacion": "PUNTAJE_INSUFICIENTE",
  "razonDerivacion": "Puntaje global insuficiente (80/100) inferior al umbral de aprobación automática configurado (90 puntos). Prohibición de rechazo automático conforme a DEC-04.",
  "esFacturable": false,
  "fechaVencimientoSLA": "2026-10-21T21:41:06.376Z",
  "nivelPrioridad": "MEDIA"
}
```

**Veredicto: cumple.** El caso con puntaje bajo se deriva a revisión y no se rechaza automáticamente.

## Comprobación de no persistencia

Después de A–D se ejecutó:

```sql
SELECT "idCaso", "puntajeConfianza"
FROM casos
WHERE "idCaso" LIKE 'VERIFY-F4-%'
ORDER BY "idCaso";
```

**Salida real:**

```text
 idCaso | puntajeConfianza
--------+------------------
(0 rows)
```

## Desglose de `CASO-SEED-002`

`GET /api/v1/scoring/cases/CASO-SEED-002/breakdown` devolvió puntaje persistido `74` y estas señales:

| Señal | Puntaje | Peso | Producto |
|---|---:|---:|---:|
| `AUTENTICIDAD_DOCUMENTAL` | 80 | 0,4 | 32 |
| `COHERENCIA_FECHAS` | 65 | 0,35 | 22,75 |
| `CRUCE_FUENTES` | 78 | 0,25 | 19,5 |
| **Suma ponderada** | | | **74,25** |

La respuesta JSON del endpoint fue:

```json
{
  "idCaso": "CASO-SEED-002",
  "puntajeConfianza": 74,
  "umbralAprobacion": 90,
  "alertaFraudeActiva": false,
  "senales": [
    {
      "tipoSenal": "AUTENTICIDAD_DOCUMENTAL",
      "puntaje": 80,
      "pesoPonderacion": 0.4,
      "umbralMinimo": 60
    },
    {
      "tipoSenal": "COHERENCIA_FECHAS",
      "puntaje": 65,
      "pesoPonderacion": 0.35,
      "umbralMinimo": 60
    },
    {
      "tipoSenal": "CRUCE_FUENTES",
      "puntaje": 78,
      "pesoPonderacion": 0.25,
      "umbralMinimo": 60
    }
  ]
}
```

La implementación redondea el puntaje calculado a una décima; `74,25` da `74,3`, mientras que el registro persistido y la respuesta del desglose informan `74`.

**Veredicto: no cumple la comprobación de consistencia exacta.** La suma de las señales no coincide con el puntaje almacenado: diferencia `0,25` antes del redondeo, o `0,3` comparando el valor redondeado con el persistido. Se registra la desviación; no se cambió el seed ni la lógica de negocio.

## Resultado resumido

| Caso | Puntaje/causal observada | Decisión | Rechazo automático | Veredicto |
|---|---|---|---|---|
| A | 94 / `NINGUNA` | `APROBADO_AUTOMATICO` | No | Cumple |
| B | 99 / `FRAUDE` | `DERIVADO_REVISION_ASISTIDA` | No | Cumple |
| C | 96,8 / `MINIMO_SENAL` | `DERIVADO_REVISION_ASISTIDA` | No | Cumple |
| D | 80 / `PUNTAJE_INSUFICIENTE` | `DERIVADO_REVISION_ASISTIDA` | No | Cumple |
| `CASO-SEED-002` | 74,25 calculado / 74 persistido | No aplica | No aplica | **No cumple consistencia** |
