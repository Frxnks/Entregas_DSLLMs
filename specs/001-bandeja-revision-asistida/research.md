# Investigación Técnica y Decisiones de Arquitectura (Fase 0)

**Funcionalidad**: F4 - Puntaje y decisión por umbrales & F1 - Bandeja de revisión asistida  
**Rama**: `002-puntaje-decision-umbrales`  
**Fecha**: 2026-10-17  
**Estado**: Consolidado  

---

## 1. Decisiones Tecnológicas del Stack Fijado

### 1.1 Orquestación y Contenedores: Docker y Docker Compose
- **Decisión**: Utilizar Docker Compose con imágenes base optimizadas (`postgres:16-alpine`, `node:20-alpine` para backend NestJS y frontend Next.js) y configuración de volumen persistente.
- **Razón / Justificación**: Cumple el requisito mandatorio de levantamiento integral del entorno en menos de 15 minutos con un único comando (`docker compose up -d`). Garantiza paridad absoluta entre entornos locales de desarrollo, pruebas automatizadas y producción, aislando dependencias del sistema operativo host.
- **Alternativas consideradas**: Kubernetes / Minikube (descartado por sobrecarga operativa y complejidad desproporcionada para el MVP) y ejecución en host sin contenedores (descartada por inconsistencia de versiones de Node/Postgres).

### 1.2 Base de Datos: PostgreSQL 16 con Prisma ORM
- **Decisión**: Desplegar PostgreSQL 16 (`postgres:16-alpine`) gestionado a través de Prisma ORM v5+ en TypeScript.
- **Razón / Justificación**: PostgreSQL 16 ofrece soporte nativo robusto para JSONB (crucial para almacenar coordenadas espaciales `ubicacionHallazgo` y desgloses analíticos de señales), integridad referencial estricta, restricciones a nivel de tabla (`CHECK constraints`) y transacciones ACID atómicas. Prisma ORM provee tipado estático riguroso end-to-end, migraciones versionadas inmutables y un mecanismo declarativo de seed (`prisma db seed`).
- **Alternativas consideradas**: TypeORM (descartado por menor seguridad de tipos y mayor propensión a errores en migraciones) y MongoDB (descartado por no garantizar de forma nativa la estricta integridad relacional y trazabilidad append-only requerida por auditoría financiera).

### 1.3 Backend: NestJS (TypeScript) con Arquitectura Modular
- **Decisión**: Implementar el backend como una aplicación NestJS estructurada en módulos de dominio de alta cohesión y bajo acoplamiento: `ScoringModule` (implementación de F4) y `ReviewTrayModule` (implementación de F1), complementados por un módulo transversal `PrismaModule` y un servicio estático para servir la evidencia ficticia.
- **Razón / Justificación**: NestJS proporciona inyección de dependencias empresarial, separación clara de capas (Controllers, Services, DTOs con `class-validator`), manejo de excepciones estandarizado y soporte directo para validación de contratos REST. Permite desacoplar el motor de reglas y cálculo de puntaje de la lógica de interfaz de usuario de la bandeja asistida.
- **Alternativas consideradas**: Express puro (descartado por falta de estructura opinada y mayor boilerplate para testing/validación) y FastAPI/Python (descartado por el mandato expreso de TypeScript unificado en todo el stack).

### 1.4 Frontend: Next.js (App Router, TypeScript) con Tailwind CSS y shadcn/ui
- **Decisión**: Implementar la interfaz de usuario en Next.js 14+ utilizando el App Router con Server Components (RSC) y Client Components puntuales, estilizado con Tailwind CSS y componentes accesibles de shadcn/ui (Radix UI), con idioma 100% en español.
- **Razón / Justificación**: Los Server Components permiten pre-renderizar las vistas de la bandeja y el detalle de casos en el servidor, garantizando que el tiempo de carga de pantalla sea estrictamente inferior a 2 segundos (satisfaciendo RQNF-008 y PX-08). shadcn/ui provee componentes de alta calidad (tablas de datos, diálogos de confirmación, visores con zoom y badges de alerta) sin sobrecargar el bundle del cliente.
- **Alternativas consideradas**: Single Page Application con React + Vite (descartada porque requiere múltiples viajes red hacia la API para renderizar la pantalla inicial, dificultando el umbral de 2 segundos) y Angular (descartado por menor velocidad de iteración y mayor huella de desarrollo).

### 1.5 Testing: Jest + Supertest (API) y Playwright (E2E)
- **Decisión**: Configurar Jest con Supertest para pruebas unitarias, de integración y verificación de requerimientos no funcionales de API (PX-01, PX-05); y Playwright para pruebas funcionales de extremo a extremo en navegador que validen los flujos del operador humano (PF-09, PF-10, PF-11, PF-20, PX-08).
- **Razón / Justificación**: Supertest permite ejecutar assertions HTTP directas contra la app de NestJS en memoria o en contenedor en milisegundos. Playwright permite medir con precisión de microsegundos los tiempos de carga de página, interactuar con el visor de evidencia y validar la captura visual de hallazgos.
- **Alternativas consideradas**: Cypress (descartado por ser más lento en ejecución headless y requerir mayor infraestructura) y Selenium (descartado por obsolescencia tecnológica).

---

## 2. Decisiones de Diseño de Reglas y Dominio

### 2.1 Motor Simulado y Carga por `prisma db seed`
- **Decisión**: No diseñar ni invocar servicios reales de OCR, visión artificial ni LLMs generativos externos en esta etapa. El sistema cargará mediante `prisma db seed` un conjunto determinista de datos precalculados con 3 casos emblemáticos, sus componentes de señales, puntajes de confianza normalizados (0-100), coordenadas de hallazgos (bounding boxes) y archivos PDF/JPG servidos desde almacenamiento estático local.
- **Razón / Justificación**: Cumplimiento estricto de la restricción crítica de contorno. Permite evaluar exhaustivamente la lógica del motor de scoring (F4) y la ergonomía de la bandeja asistida (F1) de forma repetible, sin incurrir en costos de inferencia ni sufrir la latencia o variabilidad de modelos externos durante las pruebas automatizadas.

### 2.2 Política de Trazabilidad e Inalterabilidad Append-Only (DEC-05 / RQNF-005)
- **Decisión**: La entidad `Decision` opera bajo un patrón estrictamente append-only. No se exponen endpoints ni métodos de ORM para `UPDATE` o `DELETE` sobre registros de decisiones ni sobre `RegistroAuditoriaUmbral`. Además, se definen disparadores o bloqueos lógicos que impiden la mutación de veredictos pasados.
- **Razón / Justificación**: Satisface el Principio Constitucional IV y el requerimiento RQNF-005 verificado por PX-05. Cualquier intento de un perfil (incluido Administrador) de modificar un registro histórico es rechazado a nivel de servicio y persistencia.

### 2.3 Concurrencia en Bandeja: Esquema Híbrido de Arriendo Temporal (Lease de 15 min)
- **Decisión**: Implementar lectura concurrente no bloqueante para todos los operadores, con adquisición de un arriendo temporal de edición (*lease*) de 15 minutos renovable por actividad (*heartbeat* cada 60s). La confirmación de resolución final es atómica (*first-to-submit* con control de versión / timestamp).
- **Razón / Justificación**: Resuelve el caso borde de colisión operativa sin bloquear a otros analistas que requieren inspeccionar antecedentes de casos vinculados. Si un operador abandona la sesión, el bloqueo expira a los 15 minutos, devolviendo el caso al pool sin intervención de TI.

### 2.4 Cómputo de SLA y Días Hábiles en Territorio Chileno (RQF-021)
- **Decisión**: El cálculo del tiempo restante de resolución de casos se formula mediante un algoritmo de calendario hábil chileno (lunes a viernes de 08:30 a 18:30 hrs), descontando noches, fines de semana y feriados oficiales de Chile, fijando un SLA nominal de 3 días hábiles (72 horas hábiles) desde la fecha de derivación.
- **Razón / Justificación**: Evita falsas alertas de vencimiento durante días inhábiles y alinea la métrica del sistema con la fiscalización de la Comisión para el Mercado Financiero (CMF) citada en ENT4.
