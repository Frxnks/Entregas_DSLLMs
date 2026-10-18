import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as http from 'http';
import * as https from 'https';
import { ScoringController } from '../src/scoring/scoring.controller';
import { ScoringEngineService } from '../src/scoring/scoring-engine.service';
import { DecisionRulesService } from '../src/scoring/decision-rules.service';
import { ThresholdService } from '../src/scoring/threshold.service';
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

describe('T027 [P] - Verificación de Requisitos No Funcionales de Scoring (PX-01, PX-02, PX-03, PX-05, PX-06)', () => {
  let app: INestApplication;
  let scoringEngineService: ScoringEngineService;
  let decisionRulesService: DecisionRulesService;
  let thresholdService: ThresholdService;
  let piiMaskingService: PiiMaskingService;
  let prismaMock: any;

  const ID_FLUJO = 'flujo-reembolso-gastos-medicos';
  const USUARIO_ADMIN = 'admin.riesgo@aseguradora.cl';

  beforeAll(async () => {
    piiMaskingService = new PiiMaskingService();

    prismaMock = {
      flujo: {
        findUnique: jest.fn(),
      },
      umbral: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      auditoriaUmbral: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      caso: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((promises) => {
        if (Array.isArray(promises)) return Promise.all(promises);
        if (typeof promises === 'function') return promises(prismaMock);
        return Promise.resolve(promises);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [
        ScoringEngineService,
        DecisionRulesService,
        ThresholdService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: PiiMaskingService,
          useValue: piiMaskingService,
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

    prismaMock.umbral.update.mockImplementation(({ data }: any) => ({
      idFlujo: ID_FLUJO,
      valorAprobacion: data.valorAprobacion,
      minimoBasalSeguridad: data.minimoBasalSeguridad ?? 60.0,
      version: data.version,
      fechaActualizacion: new Date(),
    }));

    prismaMock.auditoriaUmbral.create.mockImplementation(({ data }: any) => ({
      idAuditoria: 'aud-mock-uuid',
      idFlujo: data.idFlujo,
      valorAprobacionAnterior: data.valorAprobacionAnterior,
      valorAprobacionNuevo: data.valorAprobacionNuevo,
      minimoBasalAnterior: data.minimoBasalAnterior,
      minimoBasalNuevo: data.minimoBasalNuevo,
      usuarioModificador: data.usuarioModificador,
      fechaModificacion: new Date(),
    }));

    prismaMock.auditoriaUmbral.findMany.mockResolvedValue([]);
  });

  // =========================================================================
  // PX-01 / RQNF-001: Latencia en endpoints de scoring < 1000 ms
  // =========================================================================
  describe('PX-01 / RQNF-001: Latencia de Respuesta en Endpoints de Scoring (< 1000 ms)', () => {
    const payloadEvaluacionAprobable = {
      idCaso: 'CASO-PX01-001',
      idFlujo: ID_FLUJO,
      senales: [
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'lector_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.5,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Totales y subtotales cuadran exactamente con boleta emitida.',
          ubicacionHallazgo: { page: 1, x: 100, y: 200, width: 300, height: 50 },
        },
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_v1',
          puntaje: 94.0,
          pesoPonderacion: 0.5,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Sin signos de compresión JPEG anómala ni clonación de campos.',
        },
      ],
      persistir: false,
    };

    it('debe responder a POST /api/v1/scoring/evaluate en menos de 1000 ms de forma individual', async () => {
      const inicio = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadEvaluacionAprobable)
        .expect(200);

      const latenciaMs = Date.now() - inicio;

      expect(latenciaMs).toBeLessThan(1000);
      expect(res.body.idCaso).toBe('CASO-PX01-001');
      expect(res.body.puntajeConfianza).toBe(94.5);
      expect(res.body.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
      expect(res.body.esFacturable).toBe(true);
    });

    it('debe procesar una ráfaga de 50 peticiones concurrentes garantizando que >= 95% responden en < 1000 ms', async () => {
      const NUM_PETICIONES = 50;
      const peticiones = Array.from({ length: NUM_PETICIONES }).map((_, index) => {
        const payload = {
          ...payloadEvaluacionAprobable,
          idCaso: `CASO-PX01-BURST-${index}`,
        };
        const inicioReq = Date.now();
        return request(app.getHttpServer())
          .post('/api/v1/scoring/evaluate')
          .send(payload)
          .then((res) => ({
            statusCode: res.status,
            latenciaMs: Date.now() - inicioReq,
          }));
      });

      const inicioTotal = Date.now();
      const resultados = await Promise.all(peticiones);
      const tiempoTotalMs = Date.now() - inicioTotal;

      const exitosas = resultados.filter((r) => r.statusCode === 200);
      const enPlazo = resultados.filter((r) => r.latenciaMs < 1000);
      const porcentajeEnPlazo = (enPlazo.length / NUM_PETICIONES) * 100;

      expect(exitosas).toHaveLength(NUM_PETICIONES);
      expect(porcentajeEnPlazo).toBeGreaterThanOrEqual(95);

      // Calcular P95
      const latenciasOrdenadas = resultados.map((r) => r.latenciaMs).sort((a, b) => a - b);
      const p95 = latenciasOrdenadas[Math.floor(NUM_PETICIONES * 0.95)];
      expect(p95).toBeLessThan(1000);
    });

    it('debe responder a GET /api/v1/scoring/cases/:idCaso/breakdown en menos de 1000 ms', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce({
        idCaso: 'CASO-PX01-BD-001',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 92.0,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 92.0,
            pesoPonderacion: 1.0,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            descripcion: 'Montos íntegros',
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

      const inicio = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/v1/scoring/cases/CASO-PX01-BD-001/breakdown')
        .expect(200);
      const latenciaMs = Date.now() - inicio;

      expect(latenciaMs).toBeLessThan(1000);
      expect(res.body.idCaso).toBe('CASO-PX01-BD-001');
      expect(res.body.puntajeConfianza).toBe(92.0);
    });

    it('debe responder a GET /api/v1/scoring/thresholds/:idFlujo en menos de 1000 ms', async () => {
      const inicio = Date.now();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/scoring/thresholds/${ID_FLUJO}`)
        .expect(200);
      const latenciaMs = Date.now() - inicio;

      expect(latenciaMs).toBeLessThan(1000);
      expect(res.body.idFlujo).toBe(ID_FLUJO);
      expect(res.body.valorAprobacion).toBe(90.0);
    });
  });

  // =========================================================================
  // PX-02 / RQNF-002: Procesamiento concurrente no bloqueante
  // =========================================================================
  describe('PX-02 / RQNF-002: Procesamiento Concurrente Asincrónico y No Bloqueante', () => {
    it('debe evaluar simultáneamente expedientes heterogéneos sin bloquear el event loop ni cruzar datos entre casos', async () => {
      // Expediente 1: Aprobable (95 pts)
      const exp1 = {
        idCaso: 'CASO-CONCURRENTE-APROBABLE',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 95.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      // Expediente 2: Fraude activo (94 pts pero con alerta de fraude)
      const exp2 = {
        idCaso: 'CASO-CONCURRENTE-FRAUDE',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'FRAUDE_REIMPRESION',
            moduloOrigen: 'forense_v1',
            puntaje: 94.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: true,
            descripcion: 'Reimpresión no autorizada',
          },
        ],
      };

      // Expediente 3: Puntaje insuficiente (70 pts)
      const exp3 = {
        idCaso: 'CASO-CONCURRENTE-INSUFICIENTE',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'COHERENCIA_FECHAS',
            moduloOrigen: 'lector_v1',
            puntaje: 70.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      // Expediente 4: Mínimo basal reprobado (señal a 45 pts con mínimo basal de 60)
      const exp4 = {
        idCaso: 'CASO-CONCURRENTE-MINIMO',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 92.0,
            pesoPonderacion: 0.8,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CALIDAD_IMAGEN',
            moduloOrigen: 'ocr_v1',
            puntaje: 45.0, // Reprueba basal de 60
            pesoPonderacion: 0.2,
            umbralMinimo: 60.0,
            esAlertaFraude: false,
          },
        ],
      };

      // Lanzar las 4 peticiones en paralelo concurrente
      const [res1, res2, res3, res4] = await Promise.all([
        request(app.getHttpServer()).post('/api/v1/scoring/evaluate').send(exp1),
        request(app.getHttpServer()).post('/api/v1/scoring/evaluate').send(exp2),
        request(app.getHttpServer()).post('/api/v1/scoring/evaluate').send(exp3),
        request(app.getHttpServer()).post('/api/v1/scoring/evaluate').send(exp4),
      ]);

      // Verificar aislamiento y precisión estricta de cada evaluación independiente
      expect(res1.body.idCaso).toBe('CASO-CONCURRENTE-APROBABLE');
      expect(res1.body.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
      expect(res1.body.esFacturable).toBe(true);

      expect(res2.body.idCaso).toBe('CASO-CONCURRENTE-FRAUDE');
      expect(res2.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res2.body.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(res2.body.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(res2.body.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(res2.body.esFacturable).toBe(false);

      expect(res3.body.idCaso).toBe('CASO-CONCURRENTE-INSUFICIENTE');
      expect(res3.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res3.body.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(res3.body.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(res3.body.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
      expect(res3.body.esFacturable).toBe(false);

      expect(res4.body.idCaso).toBe('CASO-CONCURRENTE-MINIMO');
      expect(res4.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res4.body.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
      expect(res4.body.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(res4.body.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
      expect(res4.body.esFacturable).toBe(false);
    });
  });

  // =========================================================================
  // PX-03 / RQNF-003: Soberanía local sin egreso de PII
  // =========================================================================
  describe('PX-03 / RQNF-003: Soberanía Local, No Egreso de Red y Sanitización de PII', () => {
    it('debe garantizar 0 egreso de red hacia hosts externos durante el ciclo de evaluación', async () => {
      // Espiar cualquier intento de petición saliente http/https a nivel de Node.js
      const httpSpy = jest.spyOn(http, 'request');
      const httpsSpy = jest.spyOn(https, 'request');

      const payload = {
        idCaso: 'CASO-PII-SOVEREIGNTY-001',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 92.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payload)
        .expect(200);

      // RQNF-003: Los datos de clientes chilenos no salen a internet ni a servicios SaaS extranjeros
      const llamadasExternasHttp = httpSpy.mock.calls.filter((args) => {
        const options = args[0] as any;
        const host = options?.host || options?.hostname || '';
        return host !== '127.0.0.1' && host !== 'localhost' && host !== '';
      });

      expect(llamadasExternasHttp).toHaveLength(0);
      expect(httpsSpy).not.toHaveBeenCalled();

      httpSpy.mockRestore();
      httpsSpy.mockRestore();
    });

    it('debe validar que los DTOs y logs de scoring sanitizan identificadores personales chilenos (RUT y Nombre)', () => {
      const objetoConPii = {
        idCaso: 'CASO-SEED-002',
        rutTitular: '18.234.567-8',
        nombreTitular: 'Rodrigo Fuentes Tapia',
        puntajeConfianza: 74.0,
      };

      const sanitizado = piiMaskingService.sanitizarObjeto(objetoConPii);

      expect(sanitizado.rutTitular).toBe('18.234.***-*');
      expect(sanitizado.rutTitular).not.toContain('567-8');
      expect(sanitizado.nombreTitular).toBe('R*** F*** T***');
      expect(sanitizado.nombreTitular).not.toContain('Rodrigo');
      expect(sanitizado.nombreTitular).not.toContain('Fuentes');
      expect(sanitizado.puntajeConfianza).toBe(74.0);
    });

    it('debe generar hash criptográfico SHA-256 determinista para trazabilidad disociada (DEC-05 / DEC-06)', () => {
      const rut = '18.234.567-8';
      const hashA = piiMaskingService.generarHashSha256(rut);
      const hashB = piiMaskingService.generarHashSha256(rut);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64);
      expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    });

    it('debe constatar que los endpoints de scoring no exponen PII sin enmascarar en sus payloads', async () => {
      prismaMock.caso.findUnique.mockResolvedValueOnce({
        idCaso: 'CASO-SEED-001',
        idFlujo: ID_FLUJO,
        puntajeConfianza: 94.0,
        senales: [],
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

      // Verificar que en la respuesta de desglose no existen campos PII en texto claro
      expect(res.body.rutTitular).toBeUndefined();
      expect(res.body.nombreTitular).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/\d{7,8}-[0-9kK]/);
    });
  });

  // =========================================================================
  // PX-05 / RQNF-005: Inalterabilidad append-only de AuditoriaUmbral
  // =========================================================================
  describe('PX-05 / RQNF-005: Inalterabilidad Append-Only en AuditoriaUmbral', () => {
    let prismaRealService: PrismaService;
    let middlewareCapturado: (params: any, next: (params: any) => Promise<any>) => Promise<any>;

    beforeEach(async () => {
      delete process.env.ALLOW_SEED_CLEANUP;
      prismaRealService = new PrismaService();

      const originalUse = prismaRealService.$use.bind(prismaRealService);
      jest.spyOn(prismaRealService, '$use').mockImplementation((fn: any) => {
        middlewareCapturado = fn;
        return originalUse(fn);
      });
      jest.spyOn(prismaRealService, '$connect').mockResolvedValue(undefined);

      await prismaRealService.onModuleInit();
    });

    afterEach(async () => {
      delete process.env.ALLOW_SEED_CLEANUP;
    });

    it('debe rechazar terminantemente cualquier intento de actualización (update) sobre AuditoriaUmbral', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'update',
        args: {
          where: { idAuditoria: 'aud-001' },
          data: { valorAprobacionNuevo: 80.0 },
        },
      };

      await expect(middlewareCapturado(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'update' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar terminantemente cualquier intento de actualización masiva (updateMany) sobre AuditoriaUmbral', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'updateMany',
        args: {
          where: {},
          data: { valorAprobacionNuevo: 85.0 },
        },
      };

      await expect(middlewareCapturado(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'updateMany' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar terminantemente cualquier intento de eliminación individual (delete) sobre AuditoriaUmbral', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'delete',
        args: {
          where: { idAuditoria: 'aud-001' },
        },
      };

      await expect(middlewareCapturado(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'delete' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar terminantemente cualquier intento de depuración masiva (deleteMany) sobre AuditoriaUmbral', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'deleteMany',
        args: { where: {} },
      };

      await expect(middlewareCapturado(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'deleteMany' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe permitir inserción append-only (create) de nuevas calibraciones de umbral', async () => {
      const nextMock = jest.fn().mockResolvedValue({
        idAuditoria: 'aud-nueva-001',
        idFlujo: ID_FLUJO,
        valorAprobacionNuevo: 88.0,
      });

      const params = {
        model: 'AuditoriaUmbral',
        action: 'create',
        args: {
          data: {
            idFlujo: ID_FLUJO,
            valorAprobacionAnterior: 90.0,
            valorAprobacionNuevo: 88.0,
            minimoBasalAnterior: 60.0,
            minimoBasalNuevo: 60.0,
            usuarioModificador: USUARIO_ADMIN,
          },
        },
      };

      const result = await middlewareCapturado(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result.idAuditoria).toBe('aud-nueva-001');
    });

    it('debe permitir consultas de lectura (findMany) para auditoría legal y regulatoria', async () => {
      const nextMock = jest.fn().mockResolvedValue([
        { idAuditoria: 'aud-001', valorAprobacionNuevo: 90.0 },
      ]);

      const params = {
        model: 'AuditoriaUmbral',
        action: 'findMany',
        args: { where: { idFlujo: ID_FLUJO } },
      };

      const result = await middlewareCapturado(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(1);
    });

    it('debe generar registro de auditoría append-only al actualizar umbrales mediante PUT /api/v1/scoring/thresholds/:idFlujo', async () => {
      const updateDto = {
        valorAprobacion: 87.5,
        minimoBasalSeguridad: 65.0,
        usuarioModificador: USUARIO_ADMIN,
      };

      const res = await request(app.getHttpServer())
        .put(`/api/v1/scoring/thresholds/${ID_FLUJO}`)
        .send(updateDto)
        .expect(200);

      expect(res.body.idFlujo).toBe(ID_FLUJO);
      expect(res.body.valorAprobacion).toBe(87.5);
      expect(res.body.minimoBasalSeguridad).toBe(65.0);
      expect(res.body.version).toBe(2);

      // Verificar que se invocó create sobre auditoriaUmbral con los datos pertinentes
      expect(prismaMock.auditoriaUmbral.create).toHaveBeenCalledWith({
        data: {
          idFlujo: ID_FLUJO,
          valorAprobacionAnterior: 90.0,
          valorAprobacionNuevo: 87.5,
          minimoBasalAnterior: 60.0,
          minimoBasalNuevo: 65.0,
          usuarioModificador: USUARIO_ADMIN,
        },
      });
    });
  });

  // =========================================================================
  // PX-06 / RQNF-006: Resiliencia y tolerancia ante contingencias
  // =========================================================================
  describe('PX-06 / RQNF-006: Resiliencia y Tolerancia ante Contingencias', () => {
    it('debe manejar contingencia por ausencia de señales asignando puntaje 0 y derivando a revisión sin caerse', async () => {
      const payloadVacio = {
        idCaso: 'CASO-CONTINGENCIA-VACIO',
        idFlujo: ID_FLUJO,
        senales: [],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadVacio)
        .expect(200);

      // Principio §3: No asumir benevolencia ni puntajes ficticios ante falta de evidencia
      expect(res.body.puntajeConfianza).toBe(0);
      expect(res.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(res.body.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(res.body.esFacturable).toBe(false);
    });

    it('debe manejar señales con pesoPonderacion total = 0 sin arrojar división por cero ni NaN', () => {
      const senalesAnomalas = [
        {
          tipoSenal: 'ANOMALA',
          moduloOrigen: 'lector_v1',
          puntaje: 80.0,
          pesoPonderacion: 0,
          esAlertaFraude: false,
        },
      ];

      const puntaje = scoringEngineService.calcularPuntajePonderado(senalesAnomalas);
      expect(puntaje).toBe(0);
      expect(Number.isNaN(puntaje)).toBe(false);
    });

    it('debe acotar puntajes con valores extremos fuera del rango a los límites seguros 0-100', () => {
      const senalesFueraDeRango = [
        {
          tipoSenal: 'SOBREVALORADA',
          moduloOrigen: 'lector_v1',
          puntaje: 150.0,
          pesoPonderacion: 1.0,
          esAlertaFraude: false,
        },
      ];

      const puntajeMaximo = scoringEngineService.calcularPuntajePonderado(senalesFueraDeRango);
      expect(puntajeMaximo).toBe(100);

      const senalesNegativas = [
        {
          tipoSenal: 'SUBVALORADA',
          moduloOrigen: 'lector_v1',
          puntaje: -30.0,
          pesoPonderacion: 1.0,
          esAlertaFraude: false,
        },
      ];

      const puntajeMinimo = scoringEngineService.calcularPuntajePonderado(senalesNegativas);
      expect(puntajeMinimo).toBe(0);
    });

    it('debe preservar la integridad de la evaluación aun si un módulo de señal upstream sufre una falla parcial', async () => {
      // Supongamos que el módulo de autenticidad documental falló y solo se recibió consistencia de montos
      const payloadParcial = {
        idCaso: 'CASO-FALLA-PARCIAL-001',
        idFlujo: ID_FLUJO,
        senales: [
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 88.0,
            pesoPonderacion: 0.5, // Ponderación sobre el total provisto
            umbralMinimo: 60.0,
            esAlertaFraude: false,
            descripcion: 'Única señal recibida debido a indisponibilidad de módulo forense',
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/scoring/evaluate')
        .send(payloadParcial)
        .expect(200);

      // Se evalúa con la evidencia disponible (88/100 < 90), derivando a revisión sin perder el caso
      expect(res.body.puntajeConfianza).toBe(88.0);
      expect(res.body.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.body.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(res.body.esFacturable).toBe(false);
    });
  });
});
