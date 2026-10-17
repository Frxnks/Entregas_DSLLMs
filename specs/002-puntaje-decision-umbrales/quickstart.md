# Guía de Validación Rápida y Escenarios Ejecutables (Quickstart)

**Funcionalidad**: F4 - Puntaje y decisión por umbrales & F1 - Bandeja de revisión asistida  
**Rama**: `002-puntaje-decision-umbrales`  
**Fecha**: 2026-10-17  
**Estado**: Consolidado  

---

## 1. Prerrequisitos y Levantamiento del Entorno

Todo el stack se orquesta mediante Docker y Docker Compose, garantizando un despliegue completo en menos de 15 minutos con un único comando:

```bash
# 1. Clonar repositorio y situarse en la raíz
cd /home/franko/Codigos/Entregas_DSLLMs

# 2. Levantar la infraestructura en contenedores (PostgreSQL 16, NestJS, Next.js)
docker compose up -d --build

# 3. Aplicar migraciones del esquema Prisma y ejecutar el seed simulado
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

---

## 2. Escenarios de Validación End-to-End

### Escenario 1: Validación de Aprobación Automática (Caso 1: CASO-SEED-001)
- **Objetivo**: Demostrar que un caso con puntaje >= 90 sin alertas de fraude se aprueba automáticamente y se marca como validación facturable (DEC-01, DEC-11, RQF-005).
- **Ejecución vía cURL / Supertest**:
  ```bash
  curl -X GET http://localhost:3001/api/v1/scoring/cases/CASO-SEED-001/breakdown
  ```
- **Resultado Esperado**:
  - `puntajeConfianza`: 94.0 (>= 90.0).
  - `alertaFraudeActiva`: false.
  - `estadoDecision`: `APROBADO_AUTOMATICO`.
  - `esFacturable`: `true`.
  - El caso NO aparece en la bandeja de revisión asistida (`GET /api/v1/review-tray/cases`).

### Escenario 2: Derivación a Revisión por Puntaje Insuficiente (Caso 2: CASO-SEED-002)
- **Objetivo**: Demostrar que un puntaje < 90 nunca se rechaza automáticamente (DEC-04) y se deriva a la bandeja de revisión asistida con razón explicativa y SLA de 3 días (RQF-008, RQF-009, RQF-021).
- **Ejecución vía cURL / Supertest**:
  ```bash
  # 1. Consultar presencia en bandeja
  curl -X GET "http://localhost:3001/api/v1/review-tray/cases?estado=PENDIENTE_REVISION"

  # 2. Obtener vista integral del caso con hallazgos
  curl -X GET http://localhost:3001/api/v1/review-tray/cases/CASO-SEED-002
  ```
- **Resultado Esperado**:
  - `estadoCaso`: `PENDIENTE_REVISION`.
  - `puntajeConfianza`: 74.0 (< 90).
  - `razonDerivacion`: Contiene texto explicativo en lenguaje claro.
  - `ubicacionHallazgo`: Contiene coordenadas `{ page: 1, x: 120, y: 450, width: 280, height: 60 }`.
  - `tiempoRestanteHorasHabiles`: Calculado según días laborables de Chile.

### Escenario 3: Precedencia Absoluta de Fraude y Registro de Discrepancia (Caso 3: CASO-SEED-003)
- **Objetivo**: Demostrar que una alerta de fraude activa bloquea la aprobación automática aunque el puntaje sea 92 (DEC-04, RQF-023), y validar que si el operador resuelve "Aprobar", el sistema persiste la decisión inalterable y marca automáticamente la discrepancia (CU-02, RQF-010, RQF-011, RQNF-005).
- **Paso 1: Verificar derivación por fraude**:
  ```bash
  curl -X GET http://localhost:3001/api/v1/review-tray/cases/CASO-SEED-003
  # Verifica: puntaje=92.0, esAlertaFraude=true, causalDerivacion=FRAUDE, prioridad=ALTA
  ```
- **Paso 2: Adquirir lease de edición**:
  ```bash
  curl -X POST http://localhost:3001/api/v1/review-tray/cases/CASO-SEED-003/lease \
    -H "Content-Type: application/json" \
    -d '{"idOperador": "00000000-0000-0000-0000-000000000001"}'
  ```
- **Paso 3: Emitir veredicto en discrepancia con sugerencia de MIRA**:
  ```bash
  curl -X POST http://localhost:3001/api/v1/review-tray/cases/CASO-SEED-003/decision \
    -H "Content-Type: application/json" \
    -d '{
      "idOperador": "00000000-0000-0000-0000-000000000001",
      "tipoDecision": "APROBADO",
      "justificacion": "Se confirmó con la clínica que la boleta corresponde a una reimpresión válida y no a un fraude."
    }'
  ```
- **Resultado Esperado**:
  - `marcaDiscrepancia`: `true`.
  - `estadoCasoFinal`: `RESUELTO`.
  - El caso aparece listado en `GET /api/v1/review-tray/discrepancies`.

---

## 3. Comandos de Pruebas Automatizadas

```bash
# Ejecutar pruebas unitarias y de integración de API (Jest + Supertest)
docker compose exec backend npm run test

# Ejecutar pruebas de Requisitos No Funcionales (PX-01 latencia, PX-05 append-only)
docker compose exec backend npm run test:e2e -- --testPathPattern=extra-functional

# Ejecutar pruebas End-to-End de UI en navegador (Playwright - incluye validación PX-08 < 2s)
docker compose exec frontend npx playwright test
```
