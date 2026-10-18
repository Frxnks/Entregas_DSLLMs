# Prueba de funcionamiento

Guía rápida para levantar MIRA y comprobar que funciona en Windows con PowerShell.

## 1. Abrir el proyecto

Abre PowerShell en la carpeta del proyecto donde lo clonaste:

```powershell(en mi caso nikolas)
Set-Location "C:\Users\a7xsl\OneDrive\Escritorio\LLMS\Trabajo2\Entregas_DSLLMs"
```

## 2. Levantar o actualizar Docker

Este comando sirve tanto si Docker está detenido como si ya está corriendo:

```powershell
docker compose up -d --build
```

No borra los datos guardados en la base. **No ejecutes `docker compose down -v`**, porque elimina también el volumen de PostgreSQL.(SIEMPRE Y CUANDO LO NESESITES, SINO DA LO MISMO)

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

## 4. Cargar los datos de demostración en la primera instalación

Si acabas de clonar el repositorio y es la primera vez que levantas MIRA en este equipo, carga los datos de demostración para que aparezcan casos y umbrales:

```powershell
docker compose exec backend node dist/prisma/seed.js
```

El seed carga `CASO-SEED-001`, `CASO-SEED-002` y `CASO-SEED-003`, además de los umbrales del flujo. **Ejecútalo una sola vez en la primera instalación**, siempre que no tengas datos anteriores de MIRA que quieras conservar: elimina casos, decisiones, señales, evidencias, operadores, flujos, umbrales y organizaciones existentes antes de recrear los ejemplos. Si ya usabas MIRA o tienes datos importantes, no lo ejecutes; pide ayuda para revisar la base antes. Al volver a iniciar Docker en el futuro, no repitas este paso.

## 5. Probar la aplicación en el navegador

Abre o actualiza:

[http://localhost:3000/bandeja](http://localhost:3000/bandeja)

Si la página ya estaba abierta, recárgala con **Ctrl+F5**. Con los datos de demostración cargados, debe aparecer `CASO-SEED-002` en la bandeja.

## 6. Verificar la bandeja desde PowerShell

```powershell
$casos = Invoke-RestMethod http://localhost:3001/api/v1/review-tray/cases
$casos | Select-Object idCaso, puntajeConfianza, rutTitular
```

Para `CASO-SEED-002`, se espera un puntaje de **74,3** y el RUT parcialmente enmascarado, por ejemplo `18.234.***-*`.

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
