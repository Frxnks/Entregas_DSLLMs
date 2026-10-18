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
  TipoDecisionOperador,
} from '@prisma/client';

describe('T028 [P] - Validación de Escenarios de quickstart.md (F1 & F4)', () => {
  let app: INestApplication;
  let prismaMock: any;

  const ID_FLUJO = 'flujo-reembolso-gastos-medicos';
  const ID_OPERADOR_DEMO = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      operador: {
        findUnique: jest.fn(),
      },
      decision: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      flujo: {
        findUnique: jest.fn(),
      },
      umbral: {
        findUnique: jest.fn(),
      },
      auditoriaUmbral: {
        findMany: jest.fn(),
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
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Escenario 1: Validación de Aprobación Automática (Caso 1: CASO-SEED-001)', () => {
    it('debe aprobar automáticamente un caso con puntaje >= 90 sin fraude y marcarlo como facturable (DEC-01, DEC-11, RQF-005)', async () => {
      // Mock de desglose de CASO-SEED-001
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-001',
        idFlujo: ID_FLUJO,
        fechaIngreso: new Date(),
        puntajeConfianza: 94.0,
        estadoCaso: EstadoCaso.RESUELTO,
        estadoDecision: EstadoDecision.APROBADO_AUTOMATICO,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        causalDerivacion: CausalDerivacion.NINGUNA,
        razonDerivacion: null,
        esFacturable: true,
        flujo: {
          idFlujo: ID_FLUJO,
          umbral: {
            valorAprobacion: 90.0,
            minimoBasalSeguridad: 60.0,
          },
        },
        senales: [
          {
            idSenal: 'sen-001',
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 95.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            descripcion: 'Montos y totales coinciden plenamente',
            ubicacionHallazgo: null,
          },
          {
            idSenal: 'sen-002',
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_v1',
            puntaje: 93.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            descripcion: 'Documento original sin alteraciones',
            ubicacionHallazgo: null,
          },
        ],
      });

      // 1. Consultar desglose analítico
      const breakdownRes = await request(app.getHttpServer())
        .get('/api/v1/scoring/cases/CASO-SEED-001/breakdown')
        .expect(200);

      expect(breakdownRes.body.idCaso).toBe('CASO-SEED-001');
      expect(breakdownRes.body.puntajeConfianza).toBe(94.0);
      expect(breakdownRes.body.alertaFraudeActiva).toBe(false);
      expect(breakdownRes.body.umbralAprobacion).toBe(90.0);

      // 2. Comprobar que NO aparece en la bandeja de revisión asistida
      prismaMock.caso.findMany.mockResolvedValue([]);
      const bandejaRes = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases')
        .expect(200);

      const casoEnBandeja = bandejaRes.body.find((c: any) => c.idCaso === 'CASO-SEED-001');
      expect(casoEnBandeja).toBeUndefined();
    });
  });

  describe('Escenario 2: Derivación a Revisión por Puntaje Insuficiente (Caso 2: CASO-SEED-002)', () => {
    it('debe derivar a revisión con razón explicativa y SLA de 3 días sin rechazo automático (DEC-04, RQF-008, RQF-009, RQF-021)', async () => {
      const fechaVencimientoSLA = new Date(Date.now() + 48 * 3600 * 1000);

      // 1. Mock de presencia en la bandeja
      prismaMock.caso.findMany.mockResolvedValue([
        {
          idCaso: 'CASO-SEED-002',
          fechaIngreso: new Date(),
          puntajeConfianza: 74.0,
          estadoCaso: EstadoCaso.PENDIENTE_REVISION,
          sugerenciaMIRA: SugerenciaMIRA.APROBAR,
          razonDerivacion:
            'Puntaje global insuficiente (74/100) inferior al umbral de aprobación automática configurado (90 puntos). Prohibición de rechazo automático conforme a DEC-04.',
          causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
          fechaVencimientoSLA,
          nivelPrioridad: NivelPrioridad.MEDIA,
          rutTitular: '18.234.567-8',
          nombreTitular: 'Rodrigo Fuentes Tapia',
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          senales: [{ esAlertaFraude: false }],
          operadorBloqueo: null,
        },
      ]);

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases?estado=PENDIENTE_REVISION')
        .expect(200);

      expect(listRes.body).toHaveLength(1);
      const casoEnBandeja = listRes.body[0];
      expect(casoEnBandeja.idCaso).toBe('CASO-SEED-002');
      expect(casoEnBandeja.puntajeConfianza).toBe(74.0);
      expect(casoEnBandeja.estadoCaso).toBe('PENDIENTE_REVISION');
      expect(casoEnBandeja.causalDerivacion).toBe('PUNTAJE_INSUFICIENTE');
      expect(casoEnBandeja.razonDerivacion).toContain('Puntaje global insuficiente (74/100)');

      // 2. Mock de detalle con hallazgo espacial
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        fechaIngreso: new Date(),
        puntajeConfianza: 74.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        razonDerivacion:
          'Puntaje global insuficiente (74/100) inferior al umbral de aprobación automática configurado (90 puntos).',
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA,
        esAnonimizado: false,
        rutTitular: '18.234.567-8',
        nombreTitular: 'Rodrigo Fuentes Tapia',
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
        operadorBloqueo: null,
        evidencias: [
          {
            idEvidencia: 'evi-seed-002',
            idCaso: 'CASO-SEED-002',
            nombreArchivo: 'bono_desfase_002.pdf',
            tipoArchivo: 'application/pdf',
            urlAlmacenamiento: '/static/evidence/bono_desfase_002.pdf',
            esLegible: true,
            motivoIlegibilidad: null,
          },
        ],
        senales: [
          {
            idSenal: 'sen-seed-002-2',
            idEvidencia: 'evi-seed-002',
            tipoSenal: 'COHERENCIA_FECHAS',
            moduloOrigen: 'analizador_fechas_v1',
            puntaje: 65.0,
            pesoPonderacion: 0.35,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            resultado: 'ALERTA_DESFASE',
            descripcion: 'Desfase temporal de 45 días',
            ubicacionHallazgo: { page: 1, x: 120, y: 450, width: 280, height: 60 },
          },
        ],
      });

      const detailRes = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases/CASO-SEED-002')
        .expect(200);

      expect(detailRes.body.idCaso).toBe('CASO-SEED-002');
      expect(detailRes.body.senales[0].ubicacionHallazgo).toEqual({
        page: 1,
        x: 120,
        y: 450,
        width: 280,
        height: 60,
      });
      expect(detailRes.body.tiempoRestanteHorasHabiles).toBeGreaterThan(0);
    });
  });

  describe('Escenario 3: Precedencia Absoluta de Fraude y Registro de Discrepancia (Caso 3: CASO-SEED-003)', () => {
    it('debe derivar por alerta de fraude, gestionar lease y registrar discrepancia con decisión APROBADO (DEC-04, RQF-010, RQF-011, RQF-023, RQNF-005)', async () => {
      // Paso 1: Verificar derivación por fraude
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        fechaIngreso: new Date(),
        puntajeConfianza: 92.0, // Puntaje alto pero con fraude activo
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
        causalDerivacion: CausalDerivacion.FRAUDE,
        razonDerivacion: 'Alerta de fraude activa: alteración de boleta médica',
        fechaVencimientoSLA: new Date(Date.now() + 24 * 3600 * 1000),
        esAnonimizado: false,
        rutTitular: '14.567.890-1',
        nombreTitular: 'Manuel Contreras González',
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
        operadorBloqueo: null,
        evidencias: [],
        senales: [
          {
            idSenal: 'sen-fraude-001',
            tipoSenal: 'FRAUDE_MANIPULACION',
            moduloOrigen: 'forense_v1',
            puntaje: 35.0,
            pesoPonderacion: 0.3,
            umbralMinimo: 60.0,
            cumpleMinimo: false,
            esAlertaFraude: true,
            resultado: 'FRAUDE_DETECTADO',
            descripcion: 'Alteración digital detectada',
            ubicacionHallazgo: { page: 1, x: 310, y: 520, width: 140, height: 45 },
          },
        ],
      });

      const detailRes = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases/CASO-SEED-003')
        .expect(200);

      expect(detailRes.body.causalDerivacion).toBe('FRAUDE');
      expect(detailRes.body.sugerenciaMIRA).toBe('RECHAZAR');
      expect(detailRes.body.senales[0].esAlertaFraude).toBe(true);

      // Paso 2: Adquirir lease de edición
      const fechaExpiracionLease = new Date(Date.now() + 15 * 60 * 1000);
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
      });
      prismaMock.caso.update.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        operadorBloqueoId: ID_OPERADOR_DEMO,
        bloqueoExpiracion: fechaExpiracionLease,
        estadoCaso: EstadoCaso.EN_REVISION,
      });

      const leaseRes = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-003/lease')
        .send({ idOperador: ID_OPERADOR_DEMO })
        .expect(200);

      expect(leaseRes.body.idCaso).toBe('CASO-SEED-003');
      expect(leaseRes.body.operadorBloqueoId).toBe(ID_OPERADOR_DEMO);
      expect(leaseRes.body.vigenciaMinutos).toBe(15);

      // Paso 3: Emitir veredicto en discrepancia ("APROBADO" contra sugerencia "RECHAZAR")
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        estadoCaso: EstadoCaso.EN_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
        operadorBloqueoId: ID_OPERADOR_DEMO,
        bloqueoExpiracion: fechaExpiracionLease,
        decision: null,
      });

      prismaMock.operador.findUnique.mockResolvedValue({
        idOperador: ID_OPERADOR_DEMO,
        nombre: 'Carlos Liquidador Valenzuela',
        activo: true,
      });

      const decisionCreada = {
        idDecision: 'dec-discrepancia-001',
        idCaso: 'CASO-SEED-003',
        idOperador: ID_OPERADOR_DEMO,
        tipoDecision: TipoDecisionOperador.APROBADO,
        justificacion:
          'Se confirmó con la clínica que la boleta corresponde a una reimpresión válida y no a un fraude.',
        marcaDiscrepancia: true, // Discrepancia automática marcada
        fechaDecision: new Date(),
        esInalterable: true,
      };

      prismaMock.decision.create.mockResolvedValue(decisionCreada);
      prismaMock.caso.update.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        estadoCaso: EstadoCaso.RESUELTO,
      });

      const decisionRes = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-003/decision')
        .send({
          idOperador: ID_OPERADOR_DEMO,
          tipoDecision: 'APROBADO',
          justificacion:
            'Se confirmó con la clínica que la boleta corresponde a una reimpresión válida y no a un fraude.',
        })
        .expect(201);

      expect(decisionRes.body.marcaDiscrepancia).toBe(true);
      expect(decisionRes.body.estadoCasoFinal).toBe('RESUELTO');
      expect(decisionRes.body.tipoDecision).toBe('APROBADO');

      // Paso 4: El caso aparece listado en GET /api/v1/review-tray/discrepancies
      prismaMock.decision.findMany.mockResolvedValue([
        {
          idCaso: 'CASO-SEED-003',
          tipoDecision: TipoDecisionOperador.APROBADO,
          justificacion:
            'Se confirmó con la clínica que la boleta corresponde a una reimpresión válida y no a un fraude.',
          fechaDecision: new Date(),
          caso: { sugerenciaMIRA: SugerenciaMIRA.RECHAZAR },
          operador: { nombre: 'Carlos Liquidador Valenzuela' },
        },
      ]);

      const discRes = await request(app.getHttpServer())
        .get('/api/v1/review-tray/discrepancies')
        .expect(200);

      expect(discRes.body).toHaveLength(1);
      expect(discRes.body[0].idCaso).toBe('CASO-SEED-003');
      expect(discRes.body[0].decisionOperador).toBe('APROBADO');
      expect(discRes.body[0].sugerenciaMIRA).toBe('RECHAZAR');
    });
  });
});
