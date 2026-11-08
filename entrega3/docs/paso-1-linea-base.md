# Paso 1 — Línea base de validación

**Fecha:** 2026-11-08  
**Commit sugerido:** `docs(entrega3): registrar línea base de validación`

## Alcance

Se ejecutaron las pruebas disponibles antes de modificar la implementación de Entrega 3. No se editaron archivos de aplicación ni se regeneraron las métricas del RAG. No se creó ningún commit.

Al comenzar, el repositorio estaba limpio en `cfaf2c2`. La validación generó cambios locales en metadatos de instalación y en el caché de TypeScript; se restauraron esos archivos generados. El entorno Python `entrega3/.venv` está excluido por `.gitignore`.

## Entorno usado

- Python 3.12.10, dentro del rango requerido por `entrega3/service`.
- Node.js 25.2.1 y npm 11.6.2. El README recomienda Node.js 20; aunque las comprobaciones pasaron aquí, conviene repetirlas con Node.js 20 antes de cerrar la entrega.

## Resultados

| Componente | Comando | Resultado |
|---|---|---|
| Pruebas Python de Entrega 3 | `entrega3\.venv\Scripts\python.exe -m pytest entrega3\service\tests` | **17/17 aprobadas** |
| Tipos del frontend | `npm.cmd --prefix frontend run typecheck` | **Aprobado** |
| Compilación del frontend | `npm.cmd --prefix frontend run build` | **Aprobada**; incluyó la ruta `/asistente` |
| Cliente Prisma | `npm.cmd --prefix backend run prisma:generate` | **Aprobado** |
| Pruebas unitarias del backend existente | `npm.cmd --prefix backend run test -- --runInBand` | **171/172 aprobadas; 1 fallo** |

El fallo de backend está en `backend/test/case-detail.spec.ts`: el test espera `PENDIENTE_REVISION` para `CASO-SEED-002`, pero el servicio devuelve `VENCIDO_ESCALADO`. Es una prueba del backend existente, no de la nueva suite Python de CU-1. Se registra como hallazgo de la línea base y no se modifica dentro de este paso.

## Fuera de este paso

- No se ejecutó la evaluación semántica del RAG ni se actualizaron sus resultados guardados.
- No se midió generación con Gemini ni con el proveedor de demostración.
- No se ejecutaron pruebas end-to-end con navegador.
- La suite general del backend conserva el fallo descrito arriba.

## Próximo paso: validación del Golden Set por el representante

Nikolas indicó que es el representante del cliente. Para cerrar la validación del conjunto de 20 preguntas:

1. Revisar cada pregunta y su respuesta esperada contra los seis documentos del corpus.
2. Confirmar que las 12 preguntas respondibles apuntan a evidencia suficiente y que la respuesta esperada no agrega hechos sin respaldo.
3. Confirmar que las 4 preguntas sin respuesta realmente carecen de evidencia en el corpus y deben producir abstención.
4. Confirmar que las 2 preguntas de conflicto exigen mostrar ambas fuentes vigentes sin escoger una, y que las 2 de versiones identifican la versión vigente.
5. Comunicar aprobación completa o indicar los IDs que requieren corrección, explicando qué respuesta o evidencia debería cambiar. Si se aprueba, registrar el nombre del representante y la fecha reales; no completar esos datos antes de recibir su confirmación.
