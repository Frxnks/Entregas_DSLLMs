import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ReviewTrayController } from '../src/review-tray/review-tray.controller';
import { ResolutionService } from '../src/review-tray/resolution.service';
import { ConcurrencyService } from '../src/review-tray/concurrency.service';
import { ReviewTrayService } from '../src/review-tray/review-tray.service';
import { PiiMaskingService } from '../src/common/services/pii-masking.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  EstadoCaso,
  SugerenciaMIRA,
  TipoDecisionOperador,
} from '@prisma/client';
import { TipoDecisionEnum } from '../src/review-tray/dto/decision.dto';

describe('Resolución de Casos y Trazabilidad de Discrepancias (US2 - T016)', () => {
  let app: INestApplication;
  let prismaMock: any;

  // UUID v4 válido conforme a RFC 4122
  const OPERADOR_ID_VALIDO = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      operador: {
        findUnique: jest.fn(),
      },
      decision: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReviewTrayController],
      providers: [
        ResolutionService,
        PiiMaskingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConcurrencyService,
          useValue: {
            adquirirOExtenderLease: jest.fn(),
            liberarLease: jest.fn(),
          },
        },
        {
          provide: ReviewTrayService,
          useValue: {
            listarCasos: jest.fn(),
            obtenerDetalleCaso: jest.fn(),
          },
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

  describe('POST /api/v1/review-tray/cases/:idCaso/decision', () => {
    it('debe registrar exitosamente la decisión con marcaDiscrepancia = true cuando MIRA sugiere RECHAZAR y el operador emite APROBADO (CASO-SEED-003)', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
        decision: null,
      });

      prismaMock.operador.findUnique.mockResolvedValue({
        idOperador: OPERADOR_ID_VALIDO,
        nombre: 'Carlos Liquidador Valenzuela',
        email: 'liquidador.demo@mira.cl',
      });

      const fechaMock = new Date('2026-10-18T14:30:00.000Z');
      prismaMock.decision.create.mockResolvedValue({
        idDecision: '22222222-2222-4222-8222-222222222222',
        idCaso: 'CASO-SEED-003',
        idOperador: OPERADOR_ID_VALIDO,
        tipoDecision: TipoDecisionOperador.APROBADO,
        justificacion: 'Se verificó telefónicamente con el prestador emisor y no existe dolo en la boleta.',
        marcaDiscrepancia: true,
        esInalterable: true,
        fechaDecision: fechaMock,
        ipOperador: '127.0.0.1',
      });

      prismaMock.caso.update.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        estadoCaso: EstadoCaso.RESUELTO,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-003/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Se verificó telefónicamente con el prestador emisor y no existe dolo en la boleta.',
        })
        .expect(201);

      expect(response.body).toEqual({
        idDecision: '22222222-2222-4222-8222-222222222222',
        idCaso: 'CASO-SEED-003',
        estadoCasoFinal: 'RESUELTO',
        tipoDecision: 'APROBADO',
        marcaDiscrepancia: true,
        fechaDecision: fechaMock.toISOString(),
        mensaje: 'Decisión registrada exitosamente de forma inalterable.',
      });

      // Validar persistencia append-only inalterable
      expect(prismaMock.decision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idCaso: 'CASO-SEED-003',
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionOperador.APROBADO,
          marcaDiscrepancia: true,
          esInalterable: true,
          justificacion: 'Se verificó telefónicamente con el prestador emisor y no existe dolo en la boleta.',
        }),
      });

      // Validar actualización de caso y liberación de arriendo
      expect(prismaMock.caso.update).toHaveBeenCalledWith({
        where: { idCaso: 'CASO-SEED-003' },
        data: {
          estadoCaso: EstadoCaso.RESUELTO,
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
        },
      });
    });

    it('debe registrar exitosamente sin discrepancia (marcaDiscrepancia = false) cuando el operador coincide con la sugerencia de MIRA', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        decision: null,
      });

      prismaMock.operador.findUnique.mockResolvedValue({
        idOperador: OPERADOR_ID_VALIDO,
        nombre: 'Carlos Liquidador Valenzuela',
        email: 'liquidador.demo@mira.cl',
      });

      const fechaMock = new Date();
      prismaMock.decision.create.mockResolvedValue({
        idDecision: '33333333-3333-4333-8333-333333333333',
        idCaso: 'CASO-SEED-002',
        idOperador: OPERADOR_ID_VALIDO,
        tipoDecision: TipoDecisionOperador.APROBADO,
        justificacion: 'Documento original revisado y montos verificados conformes a la cobertura.',
        marcaDiscrepancia: false,
        esInalterable: true,
        fechaDecision: fechaMock,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Documento original revisado y montos verificados conformes a la cobertura.',
        })
        .expect(201);

      expect(response.body.marcaDiscrepancia).toBe(false);
      expect(prismaMock.decision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          marcaDiscrepancia: false,
        }),
      });
    });

    it('debe responder 409 Conflict si el caso ya fue resuelto previamente (persistencia inalterable append-only first-to-submit)', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-YA-RESUELTO',
        estadoCaso: EstadoCaso.RESUELTO,
        decision: {
          idDecision: 'dec-previa-001',
          tipoDecision: TipoDecisionOperador.APROBADO,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-YA-RESUELTO/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.RECHAZADO,
          justificacion: 'Intento de modificar una resolución previamente sellada e inmutable.',
        })
        .expect(409);

      expect(response.body.mensaje).toMatch(/inalterable|ya cuenta con una resolución/i);
      expect(prismaMock.decision.create).not.toHaveBeenCalled();
    });

    it('debe responder 400 Bad Request si la justificación está vacía', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: '',
        })
        .expect(400);

      expect(response.body.mensaje).toBeDefined();
    });

    it('debe responder 400 Bad Request si la justificación tiene menos de 10 caracteres', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Corta',
        })
        .expect(400);

      expect(response.body.mensaje).toMatch(/al menos 10 caracteres/i);
    });

    it('debe responder 400 Bad Request si la justificación sólo contiene espacios en blanco', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        decision: null,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: '          ', // 10 espacios en blanco
        })
        .expect(400);

      expect(response.body.mensaje).toMatch(/al menos 10 caracteres/i);
    });

    it('debe responder 400 Bad Request si el idOperador no es un UUID válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: 'no-es-uuid',
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Justificación explicativa suficiente de prueba',
        })
        .expect(400);

      expect(response.body.mensaje).toMatch(/UUID/i);
    });

    it('debe responder 400 Bad Request si el tipoDecision no pertenece al enum', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: 'DECISION_INVALIDA',
          justificacion: 'Justificación explicativa suficiente de prueba',
        })
        .expect(400);

      expect(response.body.mensaje).toMatch(/APROBADO, RECHAZADO o SOLICITAR_ANTECEDENTES/i);
    });

    it('debe responder 404 Not Found si el caso no existe', async () => {
      prismaMock.caso.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-INEXISTENTE/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Justificación explicativa suficiente de prueba',
        })
        .expect(404);

      expect(response.body.mensaje).toMatch(/no fue encontrado/i);
    });

    it('debe responder 404 Not Found si el operador no existe en la base de datos', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        decision: null,
      });
      prismaMock.operador.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/decision')
        .send({
          idOperador: OPERADOR_ID_VALIDO,
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Justificación explicativa suficiente de prueba',
        })
        .expect(404);

      expect(response.body.mensaje).toMatch(/no existe en el sistema/i);
    });
  });

  describe('GET /api/v1/review-tray/discrepancies', () => {
    it('debe retornar la lista de discrepancias para auditoría y mejora de modelos (RQF-011)', async () => {
      const fechaDecisionMock = new Date('2026-10-18T10:15:00.000Z');
      prismaMock.decision.findMany.mockResolvedValue([
        {
          idDecision: 'dec-001',
          idCaso: 'CASO-SEED-003',
          tipoDecision: TipoDecisionOperador.APROBADO,
          justificacion: 'Se verificó telefónicamente con el prestador emisor y no hay dolo.',
          marcaDiscrepancia: true,
          fechaDecision: fechaDecisionMock,
          caso: {
            idCaso: 'CASO-SEED-003',
            sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
          },
          operador: {
            nombre: 'Carlos Liquidador Valenzuela',
          },
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/review-tray/discrepancies')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        idCaso: 'CASO-SEED-003',
        sugerenciaMIRA: 'RECHAZAR',
        decisionOperador: 'APROBADO',
        justificacion: 'Se verificó telefónicamente con el prestador emisor y no hay dolo.',
        operadorNombre: 'Carlos Liquidador Valenzuela',
        fechaDecision: fechaDecisionMock.toISOString(),
      });
    });

    it('debe retornar un arreglo vacío si no existen decisiones discrepantes', async () => {
      prismaMock.decision.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/review-tray/discrepancies')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
