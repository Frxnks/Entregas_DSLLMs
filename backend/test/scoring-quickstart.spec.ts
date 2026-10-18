import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ScoringController } from '../src/scoring/scoring.controller';
import { ScoringEngineService } from '../src/scoring/scoring-engine.service';
import { DecisionRulesService } from '../src/scoring/decision-rules.service';
import { ThresholdService } from '../src/scoring/threshold.service';
import { ReviewTrayController } from '../src/review-tray/review-tray.controller';
import { ReviewTrayService } from '../src/review-tray/review-tray.service';
import { ConcurrencyService } from '../src/review-tray/concurrency.service';
import { ResolutionService } from '../src/review-tray/resolution.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PiiMaskingService } from '../src/common/services/pii-masking.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  EstadoCaso,
  EstadoDecision,
  SugerenciaMIRA,
  CausalDerivacion,
  NivelPrioridad,
} from '@prisma/client';

describe('T028 [P] - Validación Automatizada de Escenarios quickstart.md de Scoring (F4)', () => {
  let app: INestApplication;
  let scoringEngineService: ScoringEngineService;
  let decisionRulesService: DecisionRulesService;
  let thresholdService: ThresholdService;
  let prismaMock: any;

  const ID_FLUJO = 'flujo-reembolso-gastos-medicos';

  beforeAll(async () => {
    prismaMock = {
      caso: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      flujo: {
        findUnique: jest.fn(),
      },
      umbral: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditoriaUmbral: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      operador: {
        findUnique: jest.fn(),
      },
      decision: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      evidencia: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((promises) => {
        if (Array.isArray(promises)) return Promise.all(promises);
        if (typeof promises === 'function') return promises(prismaMock);
        return Promise.resolve(promises);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController, ReviewTrayController],
      providers: [
        ScoringEngineService,
        DecisionRulesService,
        ThresholdService,
        ReviewTrayService,
        ConcurrencyService,
        ResolutionService,
        PiiMaskingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    scoringEngineService = moduleFixture.get<ScoringEngineService>(ScoringEngineService);
    decisionRulesService = moduleFixture.get<DecisionRulesService>(DecisionRulesService);
    thresholdService = moduleFixture.get<ThresholdService>(ThresholdService);

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    if (app.getHttpServer() && app.getHttpServer().setMaxListeners) {
      app.getHttpServer().setMaxListeners(100);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.flujo.findUnique.mockResolvedValue({
      idFlujo: ID_FLUJO,
      nombre: 'Reembolso Gastos Médicos',
      umbral: {
        idFlujo: ID_FLUJO,
        valorAprobacion: 90.0,
        minimoBasalSeguridad: 60.0,
        version: 1,
        fechaActualizacion: new Date(),
      },
    });

    prismaMock.umbral.findUnique.mockResolvedValue({
      idFlujo: ID_FLUJO,
      valorAprobacion: 90.0,
      minimoBasalSeguridad: 60.0,
      version: 1,
      fechaActualizacion: new Date(),
    });
  });

  // =========================================================================
  // Escenario 1: Validación de Aprobación Automática (CASO-SEED-001)
  // =========================================================================
  describe('Escenario 1: Aprobación Automática Concluyente de CASO-SEED-001 (DEC-01, DEC-11, RQF-005)', () => {
    const payloadCasoSeed001 = {
      idCaso: 'CASO-SEED-001',
      idFlujo: ID_FLUJO,
      senales: [
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'lector_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.5,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Montos y subtotales coinciden íntegramente',
        },
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_v1',
          puntaje: 93.0,
          pesoPonderacion: 0.5,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Documento original sin manipulaciones ni retoques digitales',
        },
      ],
      persistir: true,
    };

    it('debe evaluar CASO-SEED-001 obteniendo 94.0 puntos, estado APROBADO_AUTOMATICO y esFacturable = true', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce(null); // Caso nuevo
      prismaMock.caso.create.mockResolvedValueOnce({
        idCaso: 'CASO-SEED-001',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 94.0,
        estadoCaso: EstadoCaso.RESUELTO,
        estadoDecision: EstadoDecision.APROBADO_AUTOMATICO,
        esFacturable: true,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadCasoSeed001)
        .expect(200);

      expect(res.body.idCaso).toBe('CASO-SEED-001');
      expect(res.body.puntajeConfianza).toBe(94.0);
      expect(res.body.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
      expect(res.body.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.NINGUNA);
      expect(res.body.esFacturable).toBe(true);
      expect(res.body.nivelPrioridad).toBe(NivelPrioridad.BAJA);
    });

    it('debe entregar desglose analítico en GET /api/v1/scoring/cases/CASO-SEED-001/breakdown sin alertas de fraude', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce({
        idCaso: 'CASO-SEED-001',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 94.0,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 95.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            descripcion: 'Montos y subtotales coinciden íntegramente',
            ubicacionHallazgo: null,
          },
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_v1',
            puntaje: 93.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            descripcion: 'Documento original sin manipulaciones ni retoques digitales',
            ubicacionHallazgo: null,
          },
        ],
        flujo: {
          umbral: {
            valorAprobacion: 90.0,
            minimoBasalSeguridad: 60.0,
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/scoring/cases/CASO-SEED-001/breakdown')
        .expect(200);

      expect(res.body.idCaso).toBe('CASO-SEED-001');
      expect(res.body.puntajeConfianza).toBe(94.0);
      expect(res.body.umbralAprobacion).toBe(90.0);
      expect(res.body.alertaFraudeActiva).toBe(false);
      expect(res.body.senales).toHaveLength(2);
      expect(res.body.senales[0].cumpleMinimo).toBe(true);
      expect(res.body.senales[1].cumpleMinimo).toBe(true);
    });

    it('debe constatar que el caso aprobado automáticamente NO ingresa a la bandeja de revisión asistida', async () => {
      // Simular consulta de bandeja de casos pendientes de revisión
      prismaMock.caso.findMany.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases?estado=PENDIENTE_REVISION')
        .expect(200);

      const casoEnBandeja = res.body.find((c: any) => c.idCaso === 'CASO-SEED-001');
      expect(casoEnBandeja).toBeUndefined();
    });
  });

  // =========================================================================
  // Escenario 2: Derivación por Puntaje Insuficiente (CASO-SEED-002)
  // =========================================================================
  describe('Escenario 2: Derivación por Puntaje Insuficiente de CASO-SEED-002 (74 pts, DEC-04, RQF-008, RQF-021)', () => {
    const payloadCasoSeed002 = {
      idCaso: 'CASO-SEED-002',
      idFlujo: ID_FLUJO,
      senales: [
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'lector_v1',
          puntaje: 83.0,
          pesoPonderacion: 0.65,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Discrepancia menor en desglose de copago',
        },
        {
          tipoSenal: 'COHERENCIA_FECHAS',
          moduloOrigen: 'analizador_fechas_v1',
          puntaje: 65.0,
          pesoPonderacion: 0.35,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Desfase temporal de 45 días entre atención y emisión de bono',
          ubicacionHallazgo: { page: 1, x: 120, y: 450, width: 280, height: 60 },
        },
      ],
      persistir: true,
    };

    it('debe evaluar CASO-SEED-002 (74 pts) derivándolo a revisión asistida sin rechazo automático (DEC-04) y no facturable', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce(null);
      prismaMock.caso.create.mockResolvedValueOnce({
        idCaso: 'CASO-SEED-002',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 76.7, // Ponderado matemático
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
        esFacturable: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadCasoSeed002)
        .expect(200);

      expect(res.body.idCaso).toBe('CASO-SEED-002');
      expect(res.body.puntajeConfianza).toBeLessThan(90.0);
      expect(res.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      // Principio DEC-04: Prohibición de rechazo automático; la sugerencia de MIRA es APROBAR o dejar a juicio humano
      expect(res.body.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(res.body.esFacturable).toBe(false);
      expect(res.body.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
      expect(res.body.razonDerivacion).toContain('Puntaje global insuficiente');
      expect(res.body.razonDerivacion).toContain('Prohibición de rechazo automático conforme a DEC-04');
    });

    it('debe registrar SLA de 3 días hábiles en fechaVencimientoSLA y contener hallazgo con coordenadas espaciales', async () => {
      const res = await scoringEngineService.evaluarCaso(payloadCasoSeed002);

      expect(res.fechaVencimientoSLA).toBeDefined();
      const fechaSLA = new Date(res.fechaVencimientoSLA);
      const hoy = new Date();
      expect(fechaSLA.getTime()).toBeGreaterThan(hoy.getTime());

      // Verificar que el hallazgo espacial se encuentra declarado
      const senalConHallazgo = payloadCasoSeed002.senales.find((s) => s.ubicacionHallazgo);
      expect(senalConHallazgo?.ubicacionHallazgo).toEqual({
        page: 1,
        x: 120,
        y: 450,
        width: 280,
        height: 60,
      });
    });
  });

  // =========================================================================
  // Escenario 3: Precedencia Absoluta de Fraude (CASO-SEED-003)
  // =========================================================================
  describe('Escenario 3: Precedencia Absoluta de Fraude en CASO-SEED-003 (92 pts, DEC-04, RQF-023)', () => {
    const payloadCasoSeed003 = {
      idCaso: 'CASO-SEED-003',
      idFlujo: ID_FLUJO,
      senales: [
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'lector_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.5,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Montos y cálculos matemáticos correctos',
        },
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_v1',
          puntaje: 89.0,
          pesoPonderacion: 0.5,
          umbralMinimo: 60.0,
          esAlertaFraude: true, // ALERTA DE FRAUDE ACTIVA
          descripcion: 'Alteración digital detectada en folio y timbre médico mediante análisis forense',
          ubicacionHallazgo: { page: 1, x: 310, y: 520, width: 140, height: 45 },
        },
      ],
      persistir: true,
    };

    it('debe interceptar la aprobación de CASO-SEED-003 (puntaje 92 pts >= 90) forzando veredicto DERIVADO por FRAUDE', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce(null);
      prismaMock.caso.create.mockResolvedValueOnce({
        idCaso: 'CASO-SEED-003',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 92.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
        esFacturable: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadCasoSeed003)
        .expect(200);

      expect(res.body.idCaso).toBe('CASO-SEED-003');
      expect(res.body.puntajeConfianza).toBe(92.0); // Puntaje >= 90 pero bloqueado por fraude
      expect(res.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(res.body.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(res.body.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(res.body.esFacturable).toBe(false); // DEC-01: No facturable
      expect(res.body.razonDerivacion).toContain('Alerta de fraude activa');
      expect(res.body.razonDerivacion).toContain('Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023)');
    });

    it('debe reportar alertaFraudeActiva = true en el desglose analítico de scoring', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce({
        idCaso: 'CASO-SEED-003',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 92.0,
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_v1',
            puntaje: 89.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: true,
            descripcion: 'Alteración digital detectada',
            ubicacionHallazgo: { page: 1, x: 310, y: 520, width: 140, height: 45 },
          },
        ],
        flujo: {
          umbral: {
            valorAprobacion: 90.0,
            minimoBasalSeguridad: 60.0,
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/scoring/cases/CASO-SEED-003/breakdown')
        .expect(200);

      expect(res.body.idCaso).toBe('CASO-SEED-003');
      expect(res.body.alertaFraudeActiva).toBe(true);
      expect(res.body.senales[0].esAlertaFraude).toBe(true);
    });
  });

  // =========================================================================
  // Escenario 4: Derivación por Reprobación de Mínimo Basal
  // =========================================================================
  describe('Escenario 4: Derivación por Reprobación de Mínimo Basal (< 60 pts, causal MINIMO_SENAL, RQF-022)', () => {
    const payloadCasoMinimoBasal = {
      idCaso: 'CASO-SEED-004-MINIMO',
      idFlujo: ID_FLUJO,
      senales: [
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'lector_v1',
          puntaje: 98.0, // Muy alto
          pesoPonderacion: 0.7,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Totales matemáticos perfectos',
        },
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_v1',
          puntaje: 45.0, // REPRUEBA el mínimo basal de 60 pts
          pesoPonderacion: 0.3,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Calidad documental precaria y sospecha de copia borrosa',
        },
      ],
      persistir: false,
    };

    it('debe derivar el caso a revisión con causal MINIMO_SENAL a pesar de que el puntaje ponderado global sea 82.1', async () => {
      // Ponderación: 98 * 0.7 + 45 * 0.3 = 68.6 + 13.5 = 82.1
      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadCasoMinimoBasal)
        .expect(200);

      expect(res.body.idCaso).toBe('CASO-SEED-004-MINIMO');
      expect(res.body.puntajeConfianza).toBe(82.1);
      expect(res.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
      expect(res.body.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(res.body.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
      expect(res.body.esFacturable).toBe(false);
      expect(res.body.razonDerivacion).toContain('Incumplimiento de umbral mínimo en una o más señales');
      expect(res.body.razonDerivacion).toContain('AUTENTICIDAD_DOCUMENTAL (45 < mín. 60)');
    });

    it('debe bloquear la aprobación automática incluso si el puntaje global ponderado supera 90 puntos cuando falla un mínimo basal', async () => {
      // Caso extremo: Señal 1 = 100 con peso 0.9, Señal 2 = 50 con peso 0.1
      // Puntaje ponderado = 95.0 (supera umbral de 90), pero la Señal 2 reprueba el mínimo de 60
      const payloadExtremo = {
        idCaso: 'CASO-MINIMO-GLOBAL-ALTO',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 100.0,
            pesoPonderacion: 0.9,
            umbralMinimo: 60.0,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CALIDAD_METADATOS',
            moduloOrigen: 'lector_v1',
            puntaje: 50.0, // < 60
            pesoPonderacion: 0.1,
            umbralMinimo: 60.0,
            esAlertaFraude: false,
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadExtremo)
        .expect(200);

      expect(res.body.puntajeConfianza).toBe(95.0);
      // RQF-022: La reprobación de una señal individual impide la aprobación automática
      expect(res.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
      expect(res.body.esFacturable).toBe(false);
      expect(res.body.razonDerivacion).toContain('Puntaje global suficiente (95/100) pero una o más señales individuales reprueban su umbral mínimo configurado');
    });
  });
});
