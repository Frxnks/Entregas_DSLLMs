# Verificación del README en un clon limpio

**Fecha:** 2026-10-18  
**Commit probado:** `a89ae03` (`[IA] Aclarar inicio seguro y comandos en PowerShell`)  
**Entorno:** Windows PowerShell, Docker Compose v2.40.3-desktop.1  
**Resultado:** pasó después de añadir una espera explícita a las migraciones.

## Protección de la base existente

No se ejecutó `docker compose down -v` ni se detuvo el stack original. Antes y después de la prueba, los contenedores originales `mira-db`, `mira-backend` y `mira-frontend` siguieron activos; la base original conservó 1 flujo y 3 casos.

Para aislar el clon se añadió un `compose.clean-verify.yml` temporal, no versionado, con nombres de contenedores, red y volumen propios y puertos alternativos:

- Frontend: `http://localhost:13020`
- Backend: `http://localhost:13021`
- PostgreSQL: `localhost:15434`

El proyecto original mantuvo sus puertos `3000`, `3001` y `5432`. El navegador cargó el frontend del clon y se redirigieron sus solicitudes API al backend del clon.

## Pasos ejecutados y duración

Se clonó la revisión local `a89ae03` fuera del repositorio. Se siguieron los comandos del README, usando el archivo Compose temporal únicamente para aislar los puertos y recursos. Antes de cargar datos se esperó a los mensajes de migración y arranque indicados ahora en el README.

| Etapa | Duración medida |
|---|---:|
| `git clone --no-hardlinks` | 0,47 s |
| `docker compose up -d --build` (con configuración Compose de aislamiento) | 9,77 s |
| Espera de migraciones y arranque de NestJS | 2,58 s |
| `docker compose exec backend node dist/prisma/seed.js` | 0,51 s |
| Verificaciones HTTP | 0,31 s |
| **Total medido** | **13,65 s** |

Docker reutilizó cachés locales de imágenes y capas de build. Por tanto, los 13,65 segundos son el resultado observado con esas cachés disponibles, no una medición de descarga/build en un equipo sin caché.

## Salidas verificadas

### Contenedores

`docker compose ps` mostró los tres servicios del clon en ejecución:

```text
NAME                   SERVICE    STATUS
mira-clean3-backend    backend    Up
mira-clean3-db         db         Up (healthy)
mira-clean3-frontend   frontend   Up
```

Los puertos publicados fueron `13021->3001`, `15434->5432` y `13020->3000`.

### Migración

El log real del backend incluyó:

```text
Applying migration `0_init`
All migrations have been successfully applied.
Backend MIRA iniciado exitosamente en http://localhost:3001/api/v1
```

PostgreSQL mostró `_prisma_migrations` con `0_init` aplicada y las 9 tablas de la aplicación (`auditorias_umbral`, `casos`, `decisiones`, `evidencias`, `flujos`, `operadores`, `organizaciones`, `senales`, `umbrales`).

### Seed

El comando del README terminó con código 0 y mostró:

```text
Organización creada: Aseguradora Vida y Salud Chile S.A.
Flujo creado: Reembolso Gastos Médicos
Umbral configurado: 90 pts, Basal: 60 pts
CASO-SEED-001 cargado (Aprobado Automático, Facturable: true)
CASO-SEED-002 cargado (Derivado Revisión, Prioridad MEDIA, 74 pts)
CASO-SEED-003 cargado (Derivado Fraude, Prioridad ALTA, Alerta Activa)
Semillas cargadas exitosamente.
```

**Nota de seguimiento:** esta salida conserva el resultado histórico de la verificación inicial. El seed fue ajustado después para persistir `74.3` en `CASO-SEED-002`, consistente con el redondeo a una décima del motor; el seed no se volvió a ejecutar durante esa corrección.

Las consultas a la base confirmaron 1 flujo y 3 casos.

### Frontend

`GET http://localhost:13020/bandeja` devolvió HTTP `200`. En el navegador se cargó el encabezado **Bandeja de Revisión Asistida** y se mostraron `CASO-SEED-003` y `CASO-SEED-002`; el pie de la lista indicó `Total mostrados: 2`.

### API

`GET /api/v1/scoring/thresholds/flujo-reembolso-gastos-medicos` devolvió:

```json
{
  "idFlujo": "flujo-reembolso-gastos-medicos",
  "valorAprobacion": 90,
  "minimoBasalSeguridad": 60,
  "version": 1,
  "fechaActualizacion": "2026-10-18T21:34:21.784Z"
}
```

`GET /api/v1/review-tray/cases` devolvió un arreglo con estos dos registros:

| Caso | Estado | Causal | Puntaje |
|---|---|---|---:|
| `CASO-SEED-003` | `PENDIENTE_REVISION` | `FRAUDE` | 75,9 |
| `CASO-SEED-002` | `PENDIENTE_REVISION` | `PUNTAJE_INSUFICIENTE` | 74 |

### Corrección aplicada durante la verificación

En un primer intento se ejecutó el seed inmediatamente después de que Compose mostrara los contenedores como `Up`. El seed falló con Prisma `P2021` porque todavía no existía la tabla `public.decisiones`: `Up` no implica que el backend haya terminado de aplicar las migraciones. Tras esperar el log de migración, el seed se ejecutó correctamente.

Para que el README sea fiable en un clon limpio, se añadió la instrucción de esperar en los logs tanto `All migrations have been successfully applied` como `Backend MIRA iniciado exitosamente` antes de cargar el seed o probar la API. La corrección está en el commit `a89ae03`.

También se agregó la nota de Windows: si PowerShell bloquea scripts de npm por la política de ejecución, usar `npm.cmd` y `npx.cmd`.
