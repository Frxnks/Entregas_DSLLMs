# Prueba de funcionamiento

Guía rápida para levantar MIRA y comprobar que funciona en Windows con PowerShell.

## 1. Abrir el proyecto

Abre PowerShell en la carpeta del proyecto donde lo clonaste:

```powershell
Set-Location "C:\Users\a7xsl\OneDrive\Escritorio\LLMS\Trabajo2\Entregas_DSLLMs"
```

## 2. Levantar o actualizar Docker

Este comando sirve tanto si Docker está detenido como si ya está corriendo:

```powershell
docker compose up -d --build
```

No borra los datos guardados en la base. **No ejecutes `docker compose down -v`** salvo que quieras eliminar también el volumen de PostgreSQL y todos los datos guardados.

Comprueba el estado:

```powershell
docker compose ps
```

Espera a que `mira-db` aparezca como `healthy` y que `mira-backend` y `mira-frontend` estén `Up`.

## 3. Comprobar el inicio del backend

```powershell
docker compose logs --tail 50 backend
```

Busca el mensaje `Backend MIRA iniciado exitosamente`. Si todavía no aparece, espera unos segundos y consulta los logs otra vez.

## 4. Cargar o reponer los datos de demostración

Para una instalación nueva, carga los datos de demostración para que aparezcan casos y umbrales. Antes de una sesión de usabilidad que requiera `CASO-SEED-002` libre, repón también el seed en una base de pruebas aislada y desechable:

```powershell
docker compose exec backend node dist/prisma/seed.js
```

El seed carga `CASO-SEED-001`, `CASO-SEED-002` y `CASO-SEED-003`, además de los umbrales del flujo. **Es destructivo**: elimina casos, decisiones, señales, evidencias, operadores, flujos, umbrales y organizaciones existentes antes de recrear los ejemplos. Ejecútalo solo en una base desechable dedicada a la prueba; no lo ejecutes en una base compartida ni en una instalación con datos que quieras conservar. Al volver a iniciar Docker no es necesario repetirlo, salvo que se necesite restablecer esos datos demo para una nueva sesión y se haya confirmado que la base es aislada. Después de la tarea de usabilidad, verifica que `CASO-SEED-002` haya pasado a `RESUELTO`.

## 5. Probar la aplicación en el navegador

Abre o actualiza:

[http://localhost:3000/bandeja](http://localhost:3000/bandeja)

Si la página ya estaba abierta, recárgala con **Ctrl+F5**. Con los datos de demostración cargados, debe aparecer `CASO-SEED-002` en la bandeja.

## 6. Verificar la bandeja desde PowerShell

```powershell
$casos = Invoke-RestMethod http://localhost:3001/api/v1/review-tray/cases
$casos | Select-Object idCaso, puntajeConfianza, rutTitular
```

Para `CASO-SEED-002`, en esta revisión se espera un puntaje persistido de **74,0**. El RUT se enmascara en la respuesta; debido a una limitación conocida de doble enmascaramiento, puede mostrarse como `***`.

## 7. Verificar el desglose y los umbrales

Desglose del caso:

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/scoring/cases/CASO-SEED-002/breakdown |
    ConvertTo-Json -Depth 6
```

Umbrales del flujo:

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/scoring/thresholds/flujo-reembolso-gastos-medicos |
    ConvertTo-Json
```

Se esperan **90** puntos para aprobación y **60** como mínimo basal.

## 8. Detener Docker

Cuando termines, puedes detener los servicios conservando los datos:

```powershell
docker compose down
```

Al volver, inicia nuevamente con `docker compose up -d`. No vuelvas a ejecutar el seed para esta verificación: elimina y recrea registros de demostración antes de insertarlos.
