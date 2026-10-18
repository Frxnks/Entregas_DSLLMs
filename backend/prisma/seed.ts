import { PrismaClient, EstadoCaso, EstadoDecision, SugerenciaMIRA, CausalDerivacion, NivelPrioridad, RolOperador } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function sha256(val: string): string {
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

async function main() {
  console.log('Iniciando carga de datos semilla (Seed MIRA E2)...');

  // 1. Limpieza idempotente previa
  await prisma.decision.deleteMany();
  await prisma.senal.deleteMany();
  await prisma.evidencia.deleteMany();
  await prisma.caso.deleteMany();
  await prisma.auditoriaUmbral.deleteMany();
  await prisma.umbral.deleteMany();
  await prisma.flujo.deleteMany();
  await prisma.operador.deleteMany();
  await prisma.organizacion.deleteMany();

  // 2. Organización
  const org = await prisma.organizacion.create({
    data: {
      idOrganizacion: 'org-mira-001',
      rut: '76.123.456-7',
      nombre: 'Aseguradora Vida y Salud Chile S.A.',
    },
  });
  console.log(`Organización creada: ${org.nombre}`);

  // 3. Flujo
  const flujo = await prisma.flujo.create({
    data: {
      idFlujo: 'flujo-reembolso-gastos-medicos',
      idOrganizacion: org.idOrganizacion,
      nombre: 'Reembolso Gastos Médicos',
      version: '1.0.0',
      estado: 'ACTIVO',
    },
  });
  console.log(`Flujo creado: ${flujo.nombre}`);

  // 4. Umbral de aprobación y mínimos basales (DEC-11, RQF-022)
  const umbral = await prisma.umbral.create({
    data: {
      idUmbral: 'umbral-flujo-001',
      idFlujo: flujo.idFlujo,
      valorAprobacion: 90.0,
      minimoBasalSeguridad: 60.0,
      version: 1,
    },
  });
  console.log(`Umbral configurado: ${umbral.valorAprobacion} pts, Basal: ${umbral.minimoBasalSeguridad} pts`);

  // 5. Operador Semilla
  const operador = await prisma.operador.create({
    data: {
      idOperador: '11111111-1111-4111-8111-111111111111',
      email: 'liquidador.demo@mira.cl',
      nombre: 'Carlos Liquidador Valenzuela',
      rut: '15.432.***-*',
      rol: RolOperador.LIQUIDADOR,
      activo: true,
    },
  });
  console.log(`Operador semilla creado: ${operador.nombre} (${operador.email})`);

  // 6. CASO-SEED-001: Aprobado Automático (Facturable DEC-01)
  const caso1 = await prisma.caso.create({
    data: {
      idCaso: 'CASO-SEED-001',
      idFlujo: flujo.idFlujo,
      fechaIngreso: new Date(Date.now() - 48 * 3600 * 1000), // Hace 2 días
      puntajeConfianza: 94.0,
      estadoCaso: EstadoCaso.RESUELTO,
      estadoDecision: EstadoDecision.APROBADO_AUTOMATICO,
      sugerenciaMIRA: SugerenciaMIRA.APROBAR,
      razonDerivacion: 'Puntaje de confianza sobresaliente (94/100) que supera el umbral de aprobación de 90 sin discrepancias ni señales adversas.',
      causalDerivacion: CausalDerivacion.NINGUNA,
      fechaVencimientoSLA: new Date(Date.now() + 24 * 3600 * 1000),
      nivelPrioridad: NivelPrioridad.BAJA,
      esFacturable: true,
      rutTitular: '16.789.***-*',
      nombreTitular: 'Andrea Morales Pino',
      hashTitular: sha256('16789123-4'),
      esAnonimizado: false,
    },
  });

  const evi1 = await prisma.evidencia.create({
    data: {
      idEvidencia: 'evi-seed-001',
      idCaso: caso1.idCaso,
      nombreArchivo: 'boleta_limpia_001.pdf',
      tipoArchivo: 'PDF',
      urlAlmacenamiento: '/static/evidence/boleta_limpia_001.pdf',
      hashSha256: 'b62851682c7e5c36de59cecc526a6a8b48f77f12dfe3e935d147180e47bb30bd',
      esLegible: true,
    },
  });

  await prisma.senal.createMany({
    data: [
      {
        idSenal: 'sen-seed-001-1',
        idCaso: caso1.idCaso,
        idEvidencia: evi1.idEvidencia,
        tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
        moduloOrigen: 'lector_boletas_v1',
        puntaje: 95.0,
        pesoPonderacion: 0.40,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'FAVORABLE',
        descripcion: 'Estructura de boleta electrónica Fonasa íntegra y legible',
        ubicacionHallazgo: { page: 1, x: 50, y: 50, width: 200, height: 100 },
      },
      {
        idSenal: 'sen-seed-001-2',
        idCaso: caso1.idCaso,
        idEvidencia: evi1.idEvidencia,
        tipoSenal: 'CONSISTENCIA_MONTOS',
        moduloOrigen: 'validador_montos_v1',
        puntaje: 92.0,
        pesoPonderacion: 0.35,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'FAVORABLE',
        descripcion: 'Suma de ítems coincide exactamente con el total declarado ($45.000 CLP)',
        ubicacionHallazgo: { page: 1, x: 50, y: 200, width: 250, height: 80 },
      },
      {
        idSenal: 'sen-seed-001-3',
        idCaso: caso1.idCaso,
        idEvidencia: evi1.idEvidencia,
        tipoSenal: 'CRUCE_FUENTES',
        moduloOrigen: 'cruce_prestadores_v1',
        puntaje: 95.0,
        pesoPonderacion: 0.25,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'FAVORABLE',
        descripcion: 'RUT del médico prestador coincide en el Registro Nacional de Prestadores de Salud',
        ubicacionHallazgo: { page: 1, x: 50, y: 350, width: 300, height: 50 },
      },
    ],
  });
  console.log(`CASO-SEED-001 cargado (Aprobado Automático, Facturable: true)`);

  // 7. CASO-SEED-002: Derivado a revisión asistida por puntaje insuficiente (74 pts)
  const ahora = new Date();
  const vencimientoSlaCaso2 = new Date(ahora.getTime() + 3 * 24 * 3600 * 1000); // 3 días hábiles
  const caso2 = await prisma.caso.create({
    data: {
      idCaso: 'CASO-SEED-002',
      idFlujo: flujo.idFlujo,
      fechaIngreso: ahora,
      puntajeConfianza: 74.0,
      estadoCaso: EstadoCaso.PENDIENTE_REVISION,
      estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
      sugerenciaMIRA: SugerenciaMIRA.APROBAR,
      razonDerivacion: 'Puntaje global insuficiente (74/100) inferior al umbral de aprobación automática configurado (90 puntos). Prohibición de rechazo automático conforme a DEC-04.',
      causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
      fechaVencimientoSLA: vencimientoSlaCaso2,
      nivelPrioridad: NivelPrioridad.MEDIA,
      esFacturable: false,
      rutTitular: '18.234.***-*',
      nombreTitular: 'Rodrigo Fuentes Tapia',
      hashTitular: sha256('18234567-8'),
      esAnonimizado: false,
    },
  });

  const evi2 = await prisma.evidencia.create({
    data: {
      idEvidencia: 'evi-seed-002',
      idCaso: caso2.idCaso,
      nombreArchivo: 'bono_desfase_002.pdf',
      tipoArchivo: 'PDF',
      urlAlmacenamiento: '/static/evidence/bono_desfase_002.pdf',
      hashSha256: 'de8f52a47f51ac2dde1c6426f98860492ce59db156b4e90e710c43d5b543be71',
      esLegible: true,
    },
  });

  await prisma.senal.createMany({
    data: [
      {
        idSenal: 'sen-seed-002-1',
        idCaso: caso2.idCaso,
        idEvidencia: evi2.idEvidencia,
        tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
        moduloOrigen: 'lector_boletas_v1',
        puntaje: 80.0,
        pesoPonderacion: 0.40,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'INDETERMINADO',
        descripcion: 'Comprobante legible pero con arrugas y contraste deficiente',
        ubicacionHallazgo: { page: 1, x: 80, y: 150, width: 200, height: 80 },
      },
      {
        idSenal: 'sen-seed-002-2',
        idCaso: caso2.idCaso,
        idEvidencia: evi2.idEvidencia,
        tipoSenal: 'COHERENCIA_FECHAS',
        moduloOrigen: 'analizador_fechas_v1',
        puntaje: 65.0,
        pesoPonderacion: 0.35,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'ADVERSO',
        descripcion: 'Desfase temporal de 45 días entre la consulta médica y la emisión del comprobante',
        ubicacionHallazgo: { page: 1, x: 120, y: 450, width: 280, height: 60 },
      },
      {
        idSenal: 'sen-seed-002-3',
        idCaso: caso2.idCaso,
        idEvidencia: evi2.idEvidencia,
        tipoSenal: 'CRUCE_FUENTES',
        moduloOrigen: 'cruce_prestadores_v1',
        puntaje: 78.0,
        pesoPonderacion: 0.25,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'FAVORABLE',
        descripcion: 'Prestador reconocido pero sin especialidad declarada',
        ubicacionHallazgo: { page: 1, x: 100, y: 300, width: 250, height: 60 },
      },
    ],
  });
  console.log(`CASO-SEED-002 cargado (Derivado Revisión, Prioridad MEDIA, 74 pts)`);

  // 8. CASO-SEED-003: Derivado por Fraude (75.9 pts, Sugerencia RECHAZAR, Prioridad ALTA)
  const vencimientoSlaCaso3 = new Date(ahora.getTime() + 14 * 3600 * 1000); // 14 horas restantes (< 24h: PROXIMO_A_VENCER)
  const caso3 = await prisma.caso.create({
    data: {
      idCaso: 'CASO-SEED-003',
      idFlujo: flujo.idFlujo,
      fechaIngreso: new Date(ahora.getTime() - 20 * 3600 * 1000),
      puntajeConfianza: 75.9,
      estadoCaso: EstadoCaso.PENDIENTE_REVISION,
      estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
      sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
      razonDerivacion: 'Alerta de fraude activa: alteración digital y manipulación de píxeles detectada en el monto de la boleta médica. Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023).',
      causalDerivacion: CausalDerivacion.FRAUDE,
      fechaVencimientoSLA: vencimientoSlaCaso3,
      nivelPrioridad: NivelPrioridad.ALTA,
      esFacturable: false,
      rutTitular: '14.567.***-*',
      nombreTitular: 'Marcela Castillo Gómez',
      hashTitular: sha256('14567890-k'),
      esAnonimizado: false,
    },
  });

  const evi3 = await prisma.evidencia.create({
    data: {
      idEvidencia: 'evi-seed-003',
      idCaso: caso3.idCaso,
      nombreArchivo: 'boleta_manipulada_003.svg',
      tipoArchivo: 'IMAGEN_SVG',
      urlAlmacenamiento: '/static/evidence/boleta_manipulada_003.svg',
      hashSha256: '35db403b284a7b50caeab84f9b33906703202f09ba07743cfc4ac67f5be97e17',
      esLegible: true,
    },
  });

  await prisma.senal.createMany({
    data: [
      {
        idSenal: 'sen-seed-003-1',
        idCaso: caso3.idCaso,
        idEvidencia: evi3.idEvidencia,
        tipoSenal: 'CRUCE_FUENTES',
        moduloOrigen: 'cruce_identidad_v1',
        puntaje: 96.0,
        pesoPonderacion: 0.40,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'FAVORABLE',
        descripcion: 'Identidad del asegurado y beneficiario coinciden con la póliza',
        ubicacionHallazgo: { page: 1, x: 100, y: 100, width: 300, height: 50 },
      },
      {
        idSenal: 'sen-seed-003-2',
        idCaso: caso3.idCaso,
        idEvidencia: evi3.idEvidencia,
        tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
        moduloOrigen: 'metadatos_pdf_v1',
        puntaje: 90.0,
        pesoPonderacion: 0.30,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        resultado: 'FAVORABLE',
        descripcion: 'Metadatos estándar de archivo PDF',
        ubicacionHallazgo: { page: 1, x: 100, y: 200, width: 300, height: 60 },
      },
      {
        idSenal: 'sen-seed-003-3',
        idCaso: caso3.idCaso,
        idEvidencia: evi3.idEvidencia,
        tipoSenal: 'FRAUDE_MANIPULACION',
        moduloOrigen: 'forense_imagen_v1',
        puntaje: 35.0,
        pesoPonderacion: 0.30,
        umbralMinimo: 60.0,
        cumpleMinimo: false,
        esAlertaFraude: true,
        resultado: 'ADVERSO',
        descripcion: 'Manipulación digital de píxeles detectada en el recuadro del monto total (tipografía inconsistente)',
        ubicacionHallazgo: { page: 1, x: 310, y: 520, width: 140, height: 45 },
      },
    ],
  });
  console.log(`CASO-SEED-003 cargado (Derivado Fraude, Prioridad ALTA, Alerta Activa)`);

  console.log('Semillas cargadas exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
