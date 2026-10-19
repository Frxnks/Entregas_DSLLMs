import { test, expect } from '@playwright/test';

test.describe('F1 - Bandeja de Revisión Asistida (E2E Flujo Completo)', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar llamadas al API para garantizar determinismo y tiempos < 2s
    await page.route('**/api/v1/review-tray/cases/CASO-SEED-002/decision', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          idDecision: 'dec-e2e-002',
          idCaso: 'CASO-SEED-002',
          estadoCasoFinal: 'RESUELTO',
          tipoDecision: 'APROBADO',
          marcaDiscrepancia: false,
          fechaDecision: new Date().toISOString(),
          mensaje: 'Resolución registrada exitosamente en pista de auditoría inmutable',
        }),
      });
    });

    await page.route('**/api/v1/review-tray/cases/CASO-SEED-002/lease', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          idCaso: 'CASO-SEED-002',
          operadorBloqueoId: '11111111-1111-4111-8111-111111111111',
          bloqueoExpiracion: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          vigenciaMinutos: 15,
        }),
      });
    });
  });

  test('PX-08 / RQNF-008: Carga de /bandeja en menos de 2 segundos y visualización de lista priorizada', async ({
    page,
  }) => {
    const inicio = Date.now();
    await page.goto('/bandeja');

    // Esperar a que el encabezado y la tabla de casos derivados se desplieguen
    await expect(page.locator('h1')).toContainText('Bandeja de Revisión Asistida');
    await expect(page.locator('table')).toBeVisible();

    const duracionMs = Date.now() - inicio;
    console.log(`[PX-08 Benchmark] Tiempo de carga de /bandeja: ${duracionMs} ms`);

    // RQNF-008: Ninguna pantalla debe tardar más de 2000 ms en responder
    expect(duracionMs).toBeLessThan(2000);

    // Validar presencia de casos semilla en la bandeja (ej. CASO-SEED-002)
    await expect(page.locator('text=CASO-SEED-002')).toBeVisible();

    // Validar visualización de semáforos de SLA hábil (BadgeSLA)
    const semaforos = page.locator('table tbody tr');
    await expect(semaforos.first()).toBeVisible();
  });

  test('US1 & US3: Navegación al expediente CASO-SEED-002 y adquisición de arriendo de edición (lease)', async ({
    page,
  }) => {
    await page.goto('/bandeja');

    // Localizar la fila correspondiente a CASO-SEED-002
    const filaCaso2 = page.locator('tr', { hasText: 'CASO-SEED-002' });
    await expect(filaCaso2).toBeVisible();

    // Hacer clic en "Revisar Expediente"
    const botonRevisar = filaCaso2.locator('button', { hasText: 'Revisar Expediente' });
    await botonRevisar.click();

    // Validar redirección a la ruta /bandeja/CASO-SEED-002
    await page.waitForURL('**/bandeja/CASO-SEED-002');

    // Validar que se despliega el expediente completo en una sola pantalla (RQF-009)
    await expect(page.locator('h1')).toContainText('CASO-SEED-002');
    await expect(page.locator('text=74').first()).toBeVisible(); // Puntaje 74/100
    await expect(page.locator('text=Puntaje Bajo Umbral').or(page.locator('text=PENDIENTE REVISION')).first()).toBeVisible();
  });

  test('US1 / RQF-020: Visualización de Bounding Boxes y hallazgos espaciales sobre la evidencia', async ({
    page,
  }) => {
    await page.goto('/bandeja/CASO-SEED-002');

    // Verificar que el visor de evidencias carga el archivo asociado
    await expect(page.locator('text=bono_desfase_002.pdf').first()).toBeVisible();

    // Verificar que los Bounding Boxes se renderizan sobre la evidencia simulada
    const boundingBoxAutenticidad = page.locator('text=AUTENTICIDAD_DOCUMENTAL').first();
    await expect(boundingBoxAutenticidad).toBeVisible();

    // Hacer clic en una señal en el panel lateral de desglose de señales para enfocar
    const senalFecha = page.locator('text=COHERENCIA_FECHAS').first();
    await senalFecha.click();

    // Validar que el visor mantiene visible la región del hallazgo
    await expect(page.locator('text=COHERENCIA_FECHAS').first()).toBeVisible();
  });

  test('US1 / RQF-020: Los hallazgos naranjas del caso 003 se alinean con identidad y folio', async ({
    page,
  }) => {
    await page.route('**/api/v1/review-tray/cases/CASO-SEED-003', (route) => route.abort());
    await page.goto('/bandeja/CASO-SEED-003');

    const identidad = page.locator('div[title^="CRUCE_FUENTES:"]');
    await expect(identidad).toBeVisible();
    const autenticidad = page.locator('div[title^="AUTENTICIDAD_DOCUMENTAL:"]');
    await expect(autenticidad).toBeVisible();

    const highlightAlignment = await page
      .locator('.relative.bg-white.shadow-xl')
      .evaluate((documentPage) => {
        const image = documentPage.querySelector('img');
        if (!image) throw new Error('No se encontró la imagen de evidencia');

        const imageRect = image.getBoundingClientRect();
        const getBox = (selector: string) => {
          const element = documentPage.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`No se encontró el resaltado ${selector}`);
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        };
        const expectedBox = (box: { x: number; y: number; width: number; height: number }) => ({
          x: imageRect.x + (box.x / 612) * imageRect.width,
          y: imageRect.y + (box.y / 792) * imageRect.height,
          width: (box.width / 612) * imageRect.width,
          height: (box.height / 792) * imageRect.height,
        });

        return {
          identity: getBox('div[title^="CRUCE_FUENTES:"]'),
          expectedIdentity: expectedBox({ x: 52, y: 162, width: 190, height: 23 }),
          authenticity: getBox('div[title^="AUTENTICIDAD_DOCUMENTAL:"]'),
          expectedAuthenticity: expectedBox({ x: 414, y: 124, width: 132, height: 54 }),
        };
      });

    for (const key of ['identity', 'authenticity'] as const) {
      const actual = highlightAlignment[key];
      const expected = highlightAlignment[
        key === 'identity' ? 'expectedIdentity' : 'expectedAuthenticity'
      ];
      expect(Math.abs(actual.x - expected.x)).toBeLessThan(1);
      expect(Math.abs(actual.y - expected.y)).toBeLessThan(1);
      expect(Math.abs(actual.width - expected.width)).toBeLessThan(1);
      expect(Math.abs(actual.height - expected.height)).toBeLessThan(1);
    }
  });

  test('US2 / RQF-010: Emisión de resolución formal con motivo obligatorio y confirmación atómica', async ({
    page,
  }) => {
    await page.goto('/bandeja/CASO-SEED-002');

    // Verificar presencia del panel de resolución humana
    const panelResolucion = page.locator('text=Panel de Resolución del Operador');
    await expect(panelResolucion).toBeVisible();

    // Seleccionar opción de veredicto "APROBAR"
    const botonAprobar = page.locator('button', { hasText: 'APROBAR' });
    await botonAprobar.click();

    // Verificar que el botón de confirmación permanece deshabilitado si no hay motivo o es < 10 caracteres
    const textareaMotivo = page.locator('textarea#justificacion');
    await expect(textareaMotivo).toBeVisible();

    // Ingresar motivo corto (inválido < 10 caracteres)
    await textareaMotivo.fill('Ok');
    const botonEmitirVeredicto = page.locator('button', { hasText: 'Emitir Resolución Formal' });
    await expect(botonEmitirVeredicto).toBeDisabled();

    // Ingresar motivo exhaustivo y válido (>= 10 caracteres)
    await textareaMotivo.fill(
      'Se verificó la boleta médica y los antecedentes de atención con el prestador de salud, confirmando procedencia del gasto.'
    );

    // Ahora el botón debe quedar habilitado
    await expect(botonEmitirVeredicto).toBeEnabled();
    await botonEmitirVeredicto.click();

    // Validar que se abre el modal de confirmación con advertencia de inalterabilidad
    await expect(
      page.locator('text=Confirmación de Resolución Inalterable')
    ).toBeVisible();

    // Confirmar en el modal
    const botonModalConfirmar = page.locator('button', { hasText: 'Confirmar y Sellar Veredicto' });
    await botonModalConfirmar.click();

    // Validar que el expediente transiciona al estado resuelto y presenta confirmación de resolución
    await expect(
      page.locator('text=Expediente Resuelto (Inalterable)').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('US4 / DEC-11: Verificación de pantalla de calibración de umbrales y auditoría inmutable', async ({
    page,
  }) => {
    await page.goto('/configuracion');

    // Validar encabezado y tarjetas de umbral
    await expect(page.locator('h1')).toContainText(
      'Configuración de Umbrales y Apetito de Riesgo'
    );
    await expect(page.locator('text=Umbral Aprobación Actual')).toBeVisible();
    await expect(page.locator('text=Histórico Inmutable de Auditoría')).toBeVisible();
  });

  test('CU-02 / RQF-011: Verificación de pantalla de supervisión de discrepancias', async ({
    page,
  }) => {
    await page.goto('/discrepancias');

    // Validar encabezado de auditoría de discrepancias
    await expect(page.locator('h1')).toContainText(
      'Auditoría de Decisiones con Discrepancia'
    );
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=CASO-SEED-003')).toBeVisible();
  });
});
