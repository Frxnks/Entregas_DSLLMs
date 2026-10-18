import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ScoringController } from '../src/scoring/scoring.controller';
import { ScoringEngineService } from '../src/scoring/scoring-engine.service';
import { DecisionRulesService } from '../src/scoring/decision-rules.service';
import { ThresholdService } from '../src/scoring/threshold.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  EstadoCaso,
  EstadoDecision,
  SugerenciaMIRA,
  CausalDerivacion,
  NivelPrioridad,
} from '@prisma/client';

describe('User Story 4: Configuración y Auditoría Inalterable de Umbrales y Mínimos por Flujo (T023 - RQF-006, RQNF-005, DEC-05, DEC-11)', () => {
  let app: INestApplication;
  let scoringEngineService: ScoringEngineService;
  let thresholdService: ThresholdService;
  let prismaMock: any;

  const ID_FLUJO_VALIDO = 'flujo-reembolso-gastos-medicos';
  const USUARIO_ADMIN = 'admin.riesgo@aseguradora.cl';

  beforeEach(async () => {
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
        if (Array.isArray(promises)) {
          return Promise.all(promises);
        }
        if (typeof promises === 'function') {
          return promises(prismaMock);
        }
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
      ],
    }).compile();

    scoringEngineService = moduleFixture.get<ScoringEngineService>(ScoringEngineService);
    thresholdService = moduleFixture.get<ThresholdService>(ThresholdService);

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/scoring/thresholds/:idFlujo', () => {
    it('debe retornar exitosamente el umbral vigente (200 OK) para un flujo existente', async () => {
      const fechaActualizacionMock = new Date('2026-10-18T08:00:00.000Z');
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: ID_FLUJO_VALIDO,
        nombre: 'Reembolso Gastos Médicos',
        umbral: {
          idUmbral: 'umbral-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
          version: 1,
          fechaActualizacion: fechaActualizacionMock,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
        .expect(200);

      expect(response.body).toEqual({
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacion: 90.0,
        minimoBasalSeguridad: 60.0,
        version: 1,
        fechaActualizacion: fechaActualizacionMock.toISOString(),
      });
    });

    it('debe devolver 404 Not Found si el flujo no existe en el sistema', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/scoring/thresholds/flujo-inexistente')
        .expect(404);

      expect(response.body.message).toContain('Flujo con ID flujo-inexistente no encontrado');
    });

    it('debe devolver 404 Not Found si el flujo existe pero no tiene umbral configurado', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-sin-umbral',
        nombre: 'Flujo Sin Umbral',
        umbral: null,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/scoring/thresholds/flujo-sin-umbral')
        .expect(404);

      expect(response.body.message).toContain('Configuración de umbral para el flujo con ID flujo-sin-umbral no encontrada');
    });
  });

  describe('PUT /api/v1/scoring/thresholds/:idFlujo (Calibración y Auditoría)', () => {
    it('debe actualizar el umbral de aprobación y mínimo basal de seguridad exitosamente (200 OK)', async () => {
      const fechaAnterior = new Date('2026-10-18T08:00:00.000Z');
      const fechaNueva = new Date('2026-10-18T10:30:00.000Z');

      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: ID_FLUJO_VALIDO,
        nombre: 'Reembolso Gastos Médicos',
        umbral: {
          idUmbral: 'umbral-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
          version: 1,
          fechaActualizacion: fechaAnterior,
        },
      });

      prismaMock.umbral.update.mockResolvedValue({
        idUmbral: 'umbral-001',
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacion: 85.0,
        minimoBasalSeguridad: 65.0,
        version: 2,
        fechaActualizacion: fechaNueva,
      });

      prismaMock.auditoriaUmbral.create.mockResolvedValue({
        idAuditoria: 'audit-001',
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacionAnterior: 90.0,
        valorAprobacionNuevo: 85.0,
        minimoBasalAnterior: 60.0,
        minimoBasalNuevo: 65.0,
        usuarioModificador: USUARIO_ADMIN,
        fechaModificacion: fechaNueva,
      });

      const payload = {
        valorAprobacion: 85.0,
        minimoBasalSeguridad: 65.0,
        usuarioModificador: USUARIO_ADMIN,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacion: 85.0,
        minimoBasalSeguridad: 65.0,
        version: 2,
        fechaActualizacion: fechaNueva.toISOString(),
      });
    });

    it('debe registrar automáticamente una entrada inmutable en AuditoriaUmbral con valores previos y nuevos (RQF-006, RQNF-005, DEC-05)', async () => {
      const fechaAnterior = new Date('2026-10-18T08:00:00.000Z');
      const fechaNueva = new Date('2026-10-18T11:00:00.000Z');

      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: ID_FLUJO_VALIDO,
        nombre: 'Reembolso Gastos Médicos',
        umbral: {
          idUmbral: 'umbral-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
          version: 1,
          fechaActualizacion: fechaAnterior,
        },
      });

      prismaMock.umbral.update.mockResolvedValue({
        idUmbral: 'umbral-001',
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacion: 80.0,
        minimoBasalSeguridad: 60.0,
        version: 2,
        fechaActualizacion: fechaNueva,
      });

      prismaMock.auditoriaUmbral.create.mockResolvedValue({
        idAuditoria: 'audit-002',
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacionAnterior: 90.0,
        valorAprobacionNuevo: 80.0,
        minimoBasalAnterior: 60.0,
        minimoBasalNuevo: 60.0,
        usuarioModificador: USUARIO_ADMIN,
        fechaModificacion: fechaNueva,
      });

      const payload = {
        valorAprobacion: 80.0,
        usuarioModificador: USUARIO_ADMIN,
      };

      await request(app.getHttpServer())
        .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
        .send(payload)
        .expect(200);

      expect(prismaMock.auditoriaUmbral.create).toHaveBeenCalledWith({
        data: {
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacionAnterior: 90.0,
          valorAprobacionNuevo: 80.0,
          minimoBasalAnterior: 60.0,
          minimoBasalNuevo: 60.0, // Preservó el mínimo basal previo
          usuarioModificador: USUARIO_ADMIN,
        },
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('debe incrementar secuencialmente el número de versión en Umbral', async () => {
      const fechaMock = new Date('2026-10-18T12:00:00.000Z');

      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: ID_FLUJO_VALIDO,
        nombre: 'Reembolso Gastos Médicos',
        umbral: {
          idUmbral: 'umbral-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacion: 85.0,
          minimoBasalSeguridad: 60.0,
          version: 2, // Versión actual 2
          fechaActualizacion: fechaMock,
        },
      });

      prismaMock.umbral.update.mockResolvedValue({
        idUmbral: 'umbral-001',
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacion: 92.0,
        minimoBasalSeguridad: 60.0,
        version: 3, // Incrementa a 3
        fechaActualizacion: fechaMock,
      });

      prismaMock.auditoriaUmbral.create.mockResolvedValue({
        idAuditoria: 'audit-003',
        idFlujo: ID_FLUJO_VALIDO,
        valorAprobacionAnterior: 85.0,
        valorAprobacionNuevo: 92.0,
        minimoBasalAnterior: 60.0,
        minimoBasalNuevo: 60.0,
        usuarioModificador: 'supervisor.riesgo@mira.cl',
        fechaModificacion: fechaMock,
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
        .send({
          valorAprobacion: 92.0,
          usuarioModificador: 'supervisor.riesgo@mira.cl',
        })
        .expect(200);

      expect(prismaMock.umbral.update).toHaveBeenCalledWith({
        where: { idFlujo: ID_FLUJO_VALIDO },
        data: expect.objectContaining({
          version: 3,
        }),
      });
      expect(response.body.version).toBe(3);
    });

    it('debe retornar 404 Not Found al intentar actualizar un flujo que no existe', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .put('/api/v1/scoring/thresholds/flujo-desconocido')
        .send({
          valorAprobacion: 85.0,
          usuarioModificador: USUARIO_ADMIN,
        })
        .expect(404);

      expect(response.body.message).toContain('Flujo con ID flujo-desconocido no encontrado');
    });

    describe('Validación estricta de rangos (0.0 a 100.0) y tipos de entrada (400 Bad Request)', () => {
      it('debe devolver 400 Bad Request si valorAprobacion es menor a 0.0', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: -1.0,
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('debe devolver 400 Bad Request si valorAprobacion es mayor a 100.0', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: 100.1,
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('debe devolver 400 Bad Request si minimoBasalSeguridad es menor a 0.0', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: 85.0,
            minimoBasalSeguridad: -5.0,
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('debe devolver 400 Bad Request si minimoBasalSeguridad es mayor a 100.0', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: 85.0,
            minimoBasalSeguridad: 105.0,
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('debe devolver 400 Bad Request si valorAprobacion es de tipo inválido (no numérico)', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: 'noventa',
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('debe devolver 400 Bad Request si valorAprobacion no se proporciona', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            minimoBasalSeguridad: 60.0,
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('debe devolver 400 Bad Request si usuarioModificador es omitido o vacío', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: 85.0,
            usuarioModificador: '',
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });
    });

    describe('Principio de No Retroactividad (DEC-05, DEC-11)', () => {
      it('debe garantizar que casos históricos resueltos preservan el veredicto y estado original tras una calibración de umbral', async () => {
        // 1. Caso histórico CASO-HIST-001 evaluado y resuelto previamente con umbral original en 90.0
        // Con puntaje 85.0 fue derivado a revisión asistida (no aprobado automático, esFacturable = false)
        const casoHistorico = {
          idCaso: 'CASO-HIST-001',
          idFlujo: ID_FLUJO_VALIDO,
          puntajeConfianza: 85.0,
          estadoCaso: EstadoCaso.RESUELTO,
          estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
          sugerenciaMIRA: SugerenciaMIRA.APROBAR,
          esFacturable: false,
          razonDerivacion: 'Puntaje global insuficiente (85/100) inferior al umbral de aprobación automática (90 puntos).',
          causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
          fechaIngreso: new Date('2026-10-10T10:00:00.000Z'),
          flujo: {
            idFlujo: ID_FLUJO_VALIDO,
            umbral: {
              valorAprobacion: 90.0,
              minimoBasalSeguridad: 60.0,
            },
          },
          senales: [],
        };

        prismaMock.caso.findUnique.mockResolvedValue(casoHistorico);

        // 2. Administrador de Riesgo actualiza el umbral del flujo a 80.0
        prismaMock.flujo.findUnique.mockResolvedValue({
          idFlujo: ID_FLUJO_VALIDO,
          nombre: 'Reembolso Gastos Médicos',
          umbral: {
            idUmbral: 'umbral-001',
            idFlujo: ID_FLUJO_VALIDO,
            valorAprobacion: 90.0,
            minimoBasalSeguridad: 60.0,
            version: 1,
            fechaActualizacion: new Date('2026-10-10T08:00:00.000Z'),
          },
        });

        prismaMock.umbral.update.mockResolvedValue({
          idUmbral: 'umbral-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacion: 80.0,
          minimoBasalSeguridad: 60.0,
          version: 2,
          fechaActualizacion: new Date('2026-10-18T12:00:00.000Z'),
        });

        prismaMock.auditoriaUmbral.create.mockResolvedValue({
          idAuditoria: 'audit-retro-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacionAnterior: 90.0,
          valorAprobacionNuevo: 80.0,
          minimoBasalAnterior: 60.0,
          minimoBasalNuevo: 60.0,
          usuarioModificador: USUARIO_ADMIN,
          fechaModificacion: new Date('2026-10-18T12:00:00.000Z'),
        });

        // Ejecutar calibración a 80.0
        await request(app.getHttpServer())
          .put(`/api/v1/scoring/thresholds/${ID_FLUJO_VALIDO}`)
          .send({
            valorAprobacion: 80.0,
            usuarioModificador: USUARIO_ADMIN,
          })
          .expect(200);

        // 3. Comprobar que el caso histórico no fue mutado ni recalculado retroactivamente
        expect(prismaMock.caso.update).not.toHaveBeenCalled();
        const desgloseCasoHistorico = await scoringEngineService.obtenerDesglosePorIdCaso('CASO-HIST-001');
        expect(desgloseCasoHistorico.idCaso).toBe('CASO-HIST-001');
        expect(desgloseCasoHistorico.puntajeConfianza).toBe(85.0);

        // 4. Comprobar que un NUEVO caso evaluado con el nuevo umbral (80.0) sí obtiene APROBADO_AUTOMATICO
        prismaMock.flujo.findUnique.mockResolvedValue({
          idFlujo: ID_FLUJO_VALIDO,
          nombre: 'Reembolso Gastos Médicos',
          umbral: {
            idUmbral: 'umbral-001',
            idFlujo: ID_FLUJO_VALIDO,
            valorAprobacion: 80.0, // Vigente tras la calibración
            minimoBasalSeguridad: 60.0,
            version: 2,
            fechaActualizacion: new Date('2026-10-18T12:00:00.000Z'),
          },
        });

        const nuevoCasoResponse = await request(app.getHttpServer())
          .post('/api/v1/scoring/evaluate')
          .send({
            idCaso: 'CASO-NUEVO-POST-CALIBRACION',
            idFlujo: ID_FLUJO_VALIDO,
            senales: [
              {
                tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
                moduloOrigen: 'lector_v1',
                puntaje: 85.0, // 85.0 >= 80.0 nuevo umbral
                pesoPonderacion: 1.0,
                esAlertaFraude: false,
              },
            ],
          })
          .expect(200);

        // El nuevo caso se aprueba automáticamente bajo la nueva vigencia
        expect(nuevoCasoResponse.body.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
        expect(nuevoCasoResponse.body.esFacturable).toBe(true);
        expect(nuevoCasoResponse.body.causalDerivacion).toBe(CausalDerivacion.NINGUNA);
      });
    });
  });

  describe('Auditoría Histórica de Umbrales (ThresholdService.obtenerAuditoriasPorFlujo)', () => {
    it('debe retornar la lista cronológica inmutable de cambios en AuditoriaUmbral', async () => {
      const historialMock = [
        {
          idAuditoria: 'audit-002',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacionAnterior: 85.0,
          valorAprobacionNuevo: 80.0,
          minimoBasalAnterior: 65.0,
          minimoBasalNuevo: 60.0,
          usuarioModificador: 'supervisor@mira.cl',
          fechaModificacion: new Date('2026-10-18T14:00:00.000Z'),
        },
        {
          idAuditoria: 'audit-001',
          idFlujo: ID_FLUJO_VALIDO,
          valorAprobacionAnterior: 90.0,
          valorAprobacionNuevo: 85.0,
          minimoBasalAnterior: 60.0,
          minimoBasalNuevo: 65.0,
          usuarioModificador: USUARIO_ADMIN,
          fechaModificacion: new Date('2026-10-18T10:00:00.000Z'),
        },
      ];

      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: ID_FLUJO_VALIDO,
        nombre: 'Reembolso Gastos Médicos',
      });
      prismaMock.auditoriaUmbral.findMany.mockResolvedValue(historialMock);

      const auditorias = await thresholdService.obtenerAuditoriasPorFlujo(ID_FLUJO_VALIDO);

      expect(auditorias).toHaveLength(2);
      expect(auditorias[0].valorAprobacionAnterior).toBe(85.0);
      expect(auditorias[0].valorAprobacionNuevo).toBe(80.0);
      expect(prismaMock.auditoriaUmbral.findMany).toHaveBeenCalledWith({
        where: { idFlujo: ID_FLUJO_VALIDO },
        orderBy: { fechaModificacion: 'desc' },
      });
    });
  });
});
