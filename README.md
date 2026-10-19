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
