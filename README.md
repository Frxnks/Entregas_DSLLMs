# MIRA

MIRA (*Modelo Inteligente de Revisión Asistida*) es una aplicación de demostración para evaluar solicitudes de reembolso de gastos médicos mediante un puntaje y reglas de decisión configurables. Los casos que requieren análisis humano se muestran en una bandeja donde un operador puede revisar antecedentes, consultar evidencias y registrar una decisión. Las alertas de fraude tienen prioridad y el sistema conserva auditoría de las decisiones y de los cambios de umbral.

## Componentes

- **Frontend:** Next.js, en `http://localhost:3000`.
- **Backend/API:** NestJS y Prisma, en `http://localhost:3001/api/v1`.
- **Base de datos:** PostgreSQL 16, en el puerto `5432`.
- **Contenedores:** Docker Compose coordina los tres servicios. Al iniciar el backend se aplican automáticamente las migraciones de Prisma.

## ¿Para qué sirve la aplicación?

MIRA demuestra la revisión de solicitudes ficticias de reembolso de gastos médicos. Calcula un puntaje a partir de señales y umbrales configurados, y puede derivar casos a revisión humana. Una alerta de fraude tiene prioridad y también deriva el caso a una persona. MIRA presenta sugerencias, pero la decisión de los casos en revisión la registra el liquidador; no hay aprobación ni rechazo automático para esos casos.

En la **bandeja de revisión** se pueden priorizar los casos pendientes según su estado y plazo hábil, buscar por identificador o causal y abrir un expediente para consultar sus antecedentes. El detalle reúne el documento de ejemplo, los hallazgos marcados sobre la evidencia, el desglose de señales, el puntaje y el motivo de derivación. El operador puede revisar la sugerencia y registrar una decisión con su justificación; las discrepancias quedan disponibles para auditoría. La sección de umbrales permite consultar y administrar los valores usados por el flujo.

### Ejemplos incluidos

- **`CASO-SEED-001`:** puntaje 94; en el seed de demostración figura aprobado automáticamente.
- **`CASO-SEED-002`:** puntaje persistido 74,0; queda bajo el umbral de 90 y aparece en la bandeja para revisión humana, con sus señales y evidencia ficticia. La sugerencia no reemplaza la decisión del liquidador.
- **`CASO-SEED-003`:** incluye una alerta de fraude. Se deriva a revisión humana por fraude, independientemente de su puntaje; no es un rechazo automático.

Los casos y documentos son datos sintéticos para explorar y probar la aplicación, no expedientes reales ni una recomendación financiera o médica.

## Requisitos

- Docker Desktop instalado y en ejecución, con Docker Compose v2.
- Puertos `3000`, `3001` y `5432` disponibles.
- Git para clonar el repositorio (si aún no tienes el código).

## Iniciar la aplicación

Abre PowerShell en la carpeta raíz del proyecto (donde está `docker-compose.yml`) y ejecuta:

```powershell
docker compose up -d --build
```

La primera ejecución puede tardar mientras se descargan las imágenes y se construyen los servicios. Comprueba que estén activos:

```powershell
docker compose ps
```

Espera a que `mira-db` aparezca como `healthy` y a que `mira-backend` y `mira-frontend` estén `Up`. Luego abre **http://localhost:3000**. La página principal redirige a `/bandeja`.

El estado `Up` del backend no garantiza que ya terminaron las migraciones. Antes de cargar el seed o probar la API, revisa el log:

```powershell
docker compose logs backend
```

Continúa cuando aparezcan `All migrations have been successfully applied` y `Backend MIRA iniciado exitosamente`. Si aún no aparecen, vuelve a consultar los registros después de unos segundos. La base de datos se crea con las migraciones automáticamente. Para ver los registros si algo no inicia:

```powershell
docker compose logs -f
```

Pulsa `Ctrl+C` para dejar de seguir los registros; esto no detiene los contenedores.

## Cargar datos de demostración

La base comienza sin casos. Para insertar los casos de ejemplo y poder recorrer la interfaz, ejecuta:

```powershell
docker compose exec backend node dist/prisma/seed.js
```

El seed carga los casos `CASO-SEED-001`, `CASO-SEED-002` y `CASO-SEED-003`, entre otros datos relacionados. **Aviso:** el seed elimina primero los registros de casos, evidencias, decisiones, operadores, flujos y organizaciones de esta base antes de volver a crearlos. No lo ejecutes si quieres conservar datos propios.

Después, actualiza **http://localhost:3000/bandeja**. Los casos derivados a revisión humana aparecerán en la bandeja; también puedes abrir uno para examinar sus señales y evidencias.

## Probar la API

Con los servicios iniciados, estas solicitudes permiten comprobar la API desde PowerShell:

```powershell
curl.exe -i http://localhost:3001/api/v1/review-tray/cases
curl.exe -i http://localhost:3001/api/v1/review-tray/cases/CASO-SEED-002
curl.exe -i http://localhost:3001/api/v1/scoring/cases/CASO-SEED-001/breakdown
Invoke-RestMethod http://localhost:3001/api/v1/scoring/thresholds/flujo-reembolso-gastos-medicos
```

Estas consultas requieren haber cargado los datos de demostración. Si no ejecutaste el seed, la bandeja estará vacía y las consultas de casos o umbrales responderán `404` porque el flujo y los casos todavía no existen. Después de cargar el seed, la consulta de umbrales devuelve los valores configurados (90 puntos para aprobación y 60 para el mínimo basal).

## Pruebas automatizadas

Con Node.js y npm instalados en el equipo, desde la raíz instala las dependencias del monorepo:

```powershell
npm install
```

Ejecuta las pruebas unitarias del backend:

```powershell
Push-Location backend
npx prisma generate
Pop-Location
npm --prefix backend run test -- --runInBand
```

Genera el cliente de Prisma antes de probar: sus tipos (`EstadoCaso`, `EstadoDecision`, etc.) se crean a partir del esquema y no se incluyen como archivos fuente. La imagen Docker genera su propio cliente al construirse; eso no genera el cliente local para las pruebas.

Comprueba los tipos del frontend:

```powershell
npm --prefix frontend run typecheck
```

**Windows:** si PowerShell bloquea la ejecución de scripts de npm por la política de ejecución, usa los ejecutables `.cmd`: por ejemplo, `npm.cmd install`, `npx.cmd prisma generate` y `npm.cmd --prefix backend run test -- --runInBand`.

El proyecto también define pruebas end-to-end con Jest para el backend y Playwright para el frontend. Se pueden ejecutar con `npm --prefix backend run test:e2e` y `npm --prefix frontend run test:e2e`, respectivamente; las pruebas de navegador pueden requerir instalar previamente los navegadores de Playwright.

## Detener y volver a iniciar

Para detener los servicios sin borrar la base de datos:

```powershell
docker compose down
```

Para iniciarlos más adelante:

```powershell
docker compose up -d
```

Los datos de PostgreSQL se conservan en el volumen `postgres_data`. **No uses `docker compose down -v` salvo que quieras borrar también ese volumen y todos los datos de la base.**

## Documentación adicional

- [Prueba de funcionamiento paso a paso](prueba%20de%20funcionamiento.md)
- [Guía operativa de la bandeja de revisión](docs/review-tray-operator-guide.md)
- [Guía de la API de scoring](docs/scoring-api-guide.md)
- [Quickstart con escenarios de validación](specs/001-bandeja-revision-asistida/quickstart.md)

## Distribución actual del repositorio

La siguiente estructura contiene los archivos y carpetas versionados del proyecto. Se excluyen dependencias locales y artefactos generados como `node_modules`, `.venv`, `.next`, cachés y compilaciones.

```text
Entregas_DSLLMs/
├── .agents/
│   └── skills/
│       ├── speckit-analyze/SKILL.md
│       ├── speckit-checklist/SKILL.md
│       ├── speckit-clarify/SKILL.md
│       ├── speckit-constitution/SKILL.md
│       ├── speckit-converge/SKILL.md
│       ├── speckit-implement/SKILL.md
│       ├── speckit-plan/SKILL.md
│       ├── speckit-specify/SKILL.md
│       ├── speckit-tasks/SKILL.md
│       └── speckit-taskstoissues/SKILL.md
├── .specify/
│   ├── .gitignore
│   ├── init-options.json
│   ├── integration.json
│   ├── integrations/
│   │   ├── agy.manifest.json
│   │   └── speckit.manifest.json
│   ├── memory/
│   │   ├── .constitution-template.json
│   │   └── constitution.md
│   ├── scripts/
│   │   ├── bash/
│   │   │   ├── check-prerequisites.sh
│   │   │   ├── common.sh
│   │   │   ├── create-new-feature.sh
│   │   │   ├── resolve-template.sh
│   │   │   ├── setup-plan.sh
│   │   │   └── setup-tasks.sh
│   │   └── python/
│   │       ├── __pycache__/common.cpython-314.pyc
│   │       ├── check_prerequisites.py
│   │       ├── common.py
│   │       ├── create_new_feature.py
│   │       ├── resolve_template.py
│   │       ├── setup_plan.py
│   │       └── setup_tasks.py
│   ├── templates/
│   │   ├── checklist-template.md
│   │   ├── constitution-template.md
│   │   ├── plan-template.md
│   │   ├── spec-template.md
│   │   └── tasks-template.md
│   └── workflows/
│       ├── speckit/workflow.yml
│       └── workflow-registry.json
├── backend/
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── migrations/0_init/migration.sql
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── common/
│   │   │   ├── common.module.ts
│   │   │   ├── filters/http-exception.filter.ts
│   │   │   ├── services/pii-masking.service.ts
│   │   │   └── utils/chilean-calendar.util.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── review-tray/
│   │   │   ├── concurrency.service.ts
│   │   │   ├── resolution.service.ts
│   │   │   ├── review-tray.controller.ts
│   │   │   ├── review-tray.module.ts
│   │   │   ├── review-tray.service.ts
│   │   │   └── dto/
│   │   │       ├── case-detail.dto.ts
│   │   │       ├── case-summary.dto.ts
│   │   │       ├── decision.dto.ts
│   │   │       └── lease.dto.ts
│   │   ├── scoring/
│   │   │   ├── decision-rules.service.ts
│   │   │   ├── scoring.controller.ts
│   │   │   ├── scoring.module.ts
│   │   │   ├── scoring-engine.service.ts
│   │   │   ├── threshold.service.ts
│   │   │   └── dto/
│   │   │       ├── case-breakdown.dto.ts
│   │   │       ├── evaluate-case.dto.ts
│   │   │       ├── threshold-response.dto.ts
│   │   │       └── update-threshold.dto.ts
│   │   └── static-files.module.ts
│   ├── static/evidence/
│   │   ├── boleta_limpia_001.pdf
│   │   ├── boleta_manipulada_003.jpg
│   │   ├── boleta_manipulada_003.svg
│   │   └── bono_desfase_002.pdf
│   ├── test/
│   │   ├── audit-immutability.e2e-spec.ts
│   │   ├── case-detail.spec.ts
│   │   ├── case-resolution.spec.ts
│   │   ├── chilean-calendar.spec.ts
│   │   ├── concurrency.spec.ts
│   │   ├── extra-functional.e2e-spec.ts
│   │   ├── extra-functional-f1.e2e-spec.ts
│   │   ├── fraud-precedence.spec.ts
│   │   ├── jest-e2e.json
│   │   ├── pii-masking.spec.ts
│   │   ├── quickstart-validation.spec.ts
│   │   ├── resolution.spec.ts
│   │   ├── scoring-engine.spec.ts
│   │   ├── scoring-quickstart.spec.ts
│   │   ├── sla-concurrency.spec.ts
│   │   ├── threshold-audit.spec.ts
│   │   └── threshold-decision.spec.ts
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── docs/
│   ├── entrega1/
│   │   ├── Descripción del proyecto.docx
│   │   ├── LLMS.docx
│   │   ├── MIRA_analisis.pptx
│   │   ├── PROMPTS.md
│   │   ├── prueba.md
│   │   └── README.md
│   ├── entrega2/
│   │   ├── analisis_cruzado_especificaciones.md
│   │   ├── cambios_diagramas_persistencia.md
│   │   ├── clarificacion_cambios.md
│   │   ├── decisiones_entrega2.md
│   │   ├── especificacion_cambios.md
│   │   ├── MIRA-Entrega2.pptx
│   │   ├── MIRA-Lagos-Moraga-Chaves-Caru.pdf
│   │   ├── README.md
│   │   ├── supuestos_invalidados.md
│   │   └── evidencia/
│   │       ├── autoria.md
│   │       ├── insumos_informe.md
│   │       ├── matriz_pruebas.md
│   │       ├── prueba_usabilidad.txt
│   │       ├── sesion_aceptacion.txt
│   │       ├── verificacion_citas.md
│   │       ├── verificacion_clon_limpio.md
│   │       └── verificacion_F4.md
│   ├── review-tray-operator-guide.md
│   └── scoring-api-guide.md
├── entrega3/
│   ├── README.md
│   ├── GUIA_DEMO.md
│   ├── RESUMEN_TRABAJO_8_NOV_2026.txt
│   ├── docs/
│   │   ├── arquitectura-y-privacidad.md
│   │   ├── especificacion.md
│   │   ├── guion-demo.md
│   │   ├── paso-1-linea-base.md
│   │   ├── paso-2-revision-golden-set.md
│   │   ├── paso-3-mejora-recuperacion-rag.md
│   │   ├── paso-4-evaluacion-generacion.md
│   │   ├── paso-5-controles-mcp.md
│   │   ├── paso-6-actualizacion-entregables.md
│   │   ├── paso-7-prueba-visual.md
│   │   └── paso-8-evaluacion-generacion.md
│   ├── evaluacion/
│   │   ├── generacion_gemini_20261108_r01-r20.json
│   │   ├── golden_set.json
│   │   ├── guia_revision_generacion.md
│   │   ├── matriz_integracion.md
│   │   ├── resultados_recuperacion.json
│   │   └── resultados_recuperacion.md
│   ├── evidencias-visuales/
│   │   ├── evidencia_01_interfaz_principal.png
│   │   ├── evidencia_02_respuesta_con_evidencia.png
│   │   ├── evidencia_03_abstencion_costo_antecedentes.png
│   │   ├── evidencia_04_consulta_umbral_versiones.png
│   │   ├── evidencia_05_conflicto_umbral_demo.png
│   │   ├── evidencia_06_referencias_y_traza.png
│   │   ├── imagen1.png
│   │   └── imagen2.png
│   ├── informe/
│   │   ├── generar_informe.py
│   │   ├── Informe_Entrega_3_MIRA.md
│   │   ├── Informe_Entrega_3_MIRA.pdf
│   │   ├── Informe_Entrega_3_MIRA.tex
│   │   ├── evidencia_01_interfaz_principal.png
│   │   ├── evidencia_02_respuesta_con_evidencia.png
│   │   ├── evidencia_03_abstencion_costo_antecedentes.png
│   │   ├── evidencia_04_consulta_umbral_versiones.png
│   │   ├── evidencia_05_conflicto_umbral_demo.png
│   │   ├── evidencia_06_referencias_y_traza.png
│   │   ├── imagen1.png
│   │   ├── imagen2.png
│   │   └── qa/
│   │       ├── contact-sheet.jpg
│   │       ├── page-1.jpg
│   │       ├── page-2.jpg
│   │       ├── page-3.jpg
│   │       ├── page-4.jpg
│   │       ├── page-5.jpg
│   │       ├── page-6.jpg
│   │       ├── page-7.jpg
│   │       └── page-8.jpg
│   ├── insumos/CU-1_operador_revision/
│   │   ├── corpus/
│   │   │   ├── CAT-SEN_catalogo_senales.md
│   │   │   ├── FAQ-OPE_preguntas_frecuentes_operadores.md
│   │   │   ├── MAN-REV_manual_revision_asistida.md
│   │   │   ├── POL-DEC_v1_derogada.md
│   │   │   ├── POL-DEC_v2_vigente.md
│   │   │   └── PRO-ANT_solicitud_antecedentes.md
│   │   └── datos/CU-1_datos.xlsx
│   ├── presentacion/
│   │   ├── contenido_extraido.md
│   │   ├── generar_presentacion.js
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   └── Presentacion_Entrega_3_MIRA.pptx
│   └── service/
│       ├── .env.example
│       ├── Dockerfile
│       ├── pyproject.toml
│       ├── mira_cu1/
│       │   ├── __init__.py
│       │   ├── cli_client.py
│       │   ├── config.py
│       │   ├── corpus.py
│       │   ├── database.py
│       │   ├── evaluate.py
│       │   ├── gateway.py
│       │   ├── generation_evaluation.py
│       │   ├── main.py
│       │   ├── mcp_server.py
│       │   ├── orchestrator.py
│       │   ├── prepare.py
│       │   ├── provider.py
│       │   ├── rag.py
│       │   ├── runtime.py
│       │   ├── schemas.py
│       │   ├── security.py
│       │   └── tools.py
│       ├── mira_cu1.egg-info/
│       │   ├── dependency_links.txt
│       │   ├── PKG-INFO
│       │   ├── requires.txt
│       │   ├── SOURCES.txt
│       │   └── top_level.txt
│       └── tests/
│           ├── conftest.py
│           ├── test_actions.py
│           ├── test_api_failures.py
│           ├── test_case_scenarios.py
│           ├── test_corpus_and_privacy.py
│           ├── test_gemini_provider.py
│           └── test_generation_evaluation.py
├── entrega4/
│   └── .gitkeep
├── frontend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── next.config.js
│   ├── next-env.d.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── playwright.config.ts
│   ├── postcss.config.js
│   ├── public/.gitkeep
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.tsbuildinfo
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── asistente/page.tsx
│   │   │   ├── bandeja/page.tsx
│   │   │   ├── bandeja/[idCaso]/page.tsx
│   │   │   ├── configuracion/page.tsx
│   │   │   └── discrepancias/page.tsx
│   │   ├── components/
│   │   │   ├── BadgeSLA.tsx
│   │   │   ├── DesgloseSenales.tsx
│   │   │   ├── PanelResolucion.tsx
│   │   │   └── VisorEvidencia.tsx
│   │   ├── lib/api-client.ts
│   │   └── types/index.ts
│   └── tests/review-flow.e2e.spec.ts
├── specs/
│   ├── 001-bandeja-revision-asistida/
│   │   ├── checklists/requirements.md
│   │   ├── contracts/review-tray-api.json
│   │   ├── contracts/scoring-api.json
│   │   ├── data-model.md
│   │   ├── plan.md
│   │   ├── quickstart.md
│   │   ├── research.md
│   │   ├── spec.md
│   │   └── tasks.md
│   └── 002-puntaje-decision-umbrales/
│       ├── checklists/requirements.md
│       ├── contracts/review-tray-api.json
│       ├── contracts/scoring-api.json
│       ├── data-model.md
│       ├── plan.md
│       ├── quickstart.md
│       ├── research.md
│       ├── spec.md
│       └── tasks.md
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
├── prueba de funcionamiento.md
└── README.md
```
