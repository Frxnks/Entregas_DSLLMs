import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { ReviewTrayController } from '../src/review-tray/review-tray.controller';
import { ReviewTrayService } from '../src/review-tray/review-tray.service';
import { ConcurrencyService } from '../src/review-tray/concurrency.service';
import { ResolutionService } from '../src/review-tray/resolution.service';
import { PiiMaskingService } from '../src/common/services/pii-masking.service';
import { ChileanCalendarUtil } from '../src/common/utils/chilean-calendar.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EstadoCaso, NivelPrioridad, SugerenciaMIRA, CausalDerivacion } from '@prisma/client';

describe('Gestión de SLA Hábil y Control de Concurrencia (US3 - T021)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let reviewTrayService: ReviewTrayService;
  let concurrencyService: ConcurrencyService;

  const OPERADOR_1 = '11111111-1111-4111-8111-111111111111';
  const OPERADOR_2 = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReviewTrayController],
      providers: [
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

    reviewTrayService = moduleFixture.get<ReviewTrayService>(ReviewTrayService);
    concurrencyService = moduleFixture.get<ConcurrencyService>(ConcurrencyService);

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

  // =========================================================================
  // 1. Cómputo dinámico de horas hábiles chilenas y semáforo SLA
  // =========================================================================
  describe('Cómputo dinámico de horas hábiles (Lunes a Viernes 08:30 a 18:30)', () => {
    it('debe computar exactamente las horas dentro del horario hábil de un mismo día', () => {
      // Lunes 2026-10-19 de 09:30 a 13:30 (4 horas)
      const desde = new Date('2026-10-19T09:30:00');
      const hasta = new Date('2026-10-19T13:30:00');
      const horas = ChileanCalendarUtil.calcularHorasHabilesRestantes(desde, hasta);
      expect(horas).toBe(4.0);
    });

    it('no debe computar horas durante la noche fuera del rango 08:30 a 18:30', () => {
      // Lunes 2026-10-19 20:00 hasta Martes 2026-10-20 08:30 (debe dar 0 hrs)
      const desde = new Date('2026-10-19T20:00:00');
      const hasta = new Date('2026-10-20T08:30:00');
      const horas = ChileanCalendarUtil.calcularHorasHabilesRestantes(desde, hasta);
      expect(horas).toBe(0);
    });

    it('no debe computar horas durante fines de semana (sábado y domingo)', () => {
      // Viernes 2026-10-16 18:30 hasta Lunes 2026-10-19 08:30 (todo el fin de semana = 0 hrs hábiles)
      const desde = new Date('2026-10-16T18:30:00');
      const hasta = new Date('2026-10-19T08:30:00');
      const horas = ChileanCalendarUtil.calcularHorasHabilesRestantes(desde, hasta);
      expect(horas).toBe(0);
    });

    it('debe excluir feriados legales oficiales de Chile en el cálculo de horas hábiles', () => {
      // Jueves 2026-09-17 18:30 hasta Lunes 2026-09-21 08:30
      // 2026-09-18 es feriado oficial (Fiestas Patrias), 19 y 20 fin de semana -> 0 hrs hábiles
      const desde = new Date('2026-09-17T18:30:00');
      const hasta = new Date('2026-09-21T08:30:00');
      const horas = ChileanCalendarUtil.calcularHorasHabilesRestantes(desde, hasta);
      expect(horas).toBe(0);
    });

    it('debe computar correctamente una jornada completa de 10 horas hábiles (08:30 a 18:30)', () => {
      // Martes 2026-10-20 de 08:30 a 18:30
      const desde = new Date('2026-10-20T08:30:00');
      const hasta = new Date('2026-10-20T18:30:00');
      const horas = ChileanCalendarUtil.calcularHorasHabilesRestantes(desde, hasta);
      expect(horas).toBe(10.0);
    });

    it('debe retornar 0 horas cuando la fecha actual es igual o posterior al vencimiento', () => {
      const desde = new Date('2026-10-20T15:00:00');
      const hasta = new Date('2026-10-20T14:00:00');
      expect(ChileanCalendarUtil.calcularHorasHabilesRestantes(desde, hasta)).toBe(0);
    });

    it('debe clasificar el semáforo SLA correctamente según horas hábiles restantes', () => {
      expect(ChileanCalendarUtil.determinarEstadoSLA(25.5)).toBe('EN_PLAZO');
      expect(ChileanCalendarUtil.determinarEstadoSLA(24.0)).toBe('PROXIMO_A_VENCER');
      expect(ChileanCalendarUtil.determinarEstadoSLA(12.0)).toBe('PROXIMO_A_VENCER');
      expect(ChileanCalendarUtil.determinarEstadoSLA(0.0)).toBe('VENCIDO_ESCALADO');
      expect(ChileanCalendarUtil.determinarEstadoSLA(-3.5)).toBe('VENCIDO_ESCALADO');
    });
  });

  // =========================================================================
  // 2. Consulta de casos ordenados por prioridad y SLA (GET /api/v1/review-tray/cases)
  // =========================================================================
  describe('GET /api/v1/review-tray/cases', () => {
    it('debe retornar la lista ordenada estrictamente por prioridad (ALTA > MEDIA > BAJA) y luego por vencimiento SLA', async () => {
      const ahora = new Date();
      const vencimientoCercano = new Date(ahora.getTime() + 10 * 3600 * 1000);
      const vencimientoLejano = new Date(ahora.getTime() + 40 * 3600 * 1000);

      const casosMock = [
        {
          idCaso: 'CASO-BAJA-1',
          fechaIngreso: new Date(),
          puntajeConfianza: 85,
          razonDerivacion: 'Revisión preventiva',
          sugerenciaMIRA: SugerenciaMIRA.APROBAR,
          nivelPrioridad: NivelPrioridad.BAJA,
          causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
          fechaVencimientoSLA: vencimientoCercano,
          rutTitular: '19.876.543-2',
          nombreTitular: 'Pedro Pascal',
          esAnonimizado: false,
          senales: [{ esAlertaFraude: false }],
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          operadorBloqueo: null,
        },
        {
          idCaso: 'CASO-ALTA-URGENTE',
          fechaIngreso: new Date(),
          puntajeConfianza: 50,
          razonDerivacion: 'Fraude detectado',
          sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
          nivelPrioridad: NivelPrioridad.ALTA,
          causalDerivacion: CausalDerivacion.FRAUDE,
          fechaVencimientoSLA: vencimientoCercano,
          rutTitular: '12.345.678-5',
          nombreTitular: 'Juan Perez Soto',
          esAnonimizado: false,
          senales: [{ esAlertaFraude: true }],
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          operadorBloqueo: null,
        },
        {
          idCaso: 'CASO-ALTA-POSTERIOR',
          fechaIngreso: new Date(),
          puntajeConfianza: 60,
          razonDerivacion: 'Señal bajo umbral',
          sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
          nivelPrioridad: NivelPrioridad.ALTA,
          causalDerivacion: CausalDerivacion.MINIMO_SENAL,
          fechaVencimientoSLA: vencimientoLejano,
          rutTitular: '11.222.333-4',
          nombreTitular: 'Maria Rojas Tapia',
          esAnonimizado: false,
          senales: [{ esAlertaFraude: false }],
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          operadorBloqueo: null,
        },
        {
          idCaso: 'CASO-MEDIA-1',
          fechaIngreso: new Date(),
          puntajeConfianza: 74,
          razonDerivacion: 'Puntaje bajo umbral',
          sugerenciaMIRA: SugerenciaMIRA.APROBAR,
          nivelPrioridad: NivelPrioridad.MEDIA,
          causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
          fechaVencimientoSLA: vencimientoCercano,
          rutTitular: '15.678.901-2',
          nombreTitular: 'Carlos Gomez Morales',
          esAnonimizado: false,
          senales: [{ esAlertaFraude: false }],
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          operadorBloqueo: null,
        },
      ];

      prismaMock.caso.findMany.mockResolvedValue(casosMock);

      const response = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases')
        .expect(HttpStatus.OK);

      const lista = response.body;
      expect(Array.isArray(lista)).toBe(true);
      expect(lista.length).toBe(4);

      // El orden debe ser: ALTA-URGENTE, ALTA-POSTERIOR, MEDIA-1, BAJA-1
      expect(lista[0].idCaso).toBe('CASO-ALTA-URGENTE');
      expect(lista[0].nivelPrioridad).toBe('ALTA');
      expect(lista[0].alertaFraude).toBe(true);

      expect(lista[1].idCaso).toBe('CASO-ALTA-POSTERIOR');
      expect(lista[1].nivelPrioridad).toBe('ALTA');

      expect(lista[2].idCaso).toBe('CASO-MEDIA-1');
      expect(lista[2].nivelPrioridad).toBe('MEDIA');

      expect(lista[3].idCaso).toBe('CASO-BAJA-1');
      expect(lista[3].nivelPrioridad).toBe('BAJA');

      // Verificar protección PII en lista
      expect(lista[0].rutTitular).toBe('12.345.***-*');
      expect(lista[0].nombreTitular).toBe('J*** P*** S***');
    });

    it('debe filtrar correctamente por estado cuando se envía en la query', async () => {
      prismaMock.caso.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases?estado=PENDIENTE_REVISION')
        .expect(HttpStatus.OK);

      expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estadoCaso: EstadoCaso.PENDIENTE_REVISION,
          }),
        }),
      );
    });

    it('debe filtrar correctamente por prioridad cuando se envía en la query', async () => {
      prismaMock.caso.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases?prioridad=ALTA')
        .expect(HttpStatus.OK);

      expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nivelPrioridad: NivelPrioridad.ALTA,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // 3. Adquisición y control de arriendos temporales (leases de 15 min)
  // =========================================================================
  describe('POST /api/v1/review-tray/cases/:idCaso/lease', () => {
    it('debe adquirir exitosamente un lease de 15 minutos cuando el caso está disponible', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/lease')
        .send({ idOperador: OPERADOR_1 })
        .expect(HttpStatus.OK);

      expect(response.body.idCaso).toBe('CASO-SEED-002');
      expect(response.body.operadorBloqueoId).toBe(OPERADOR_1);
      expect(response.body.vigenciaMinutos).toBe(15);
      expect(response.body.bloqueoExpiracion).toBeDefined();

      expect(prismaMock.caso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idCaso: 'CASO-SEED-002' },
          data: expect.objectContaining({
            operadorBloqueoId: OPERADOR_1,
            estadoCaso: EstadoCaso.EN_REVISION,
          }),
        }),
      );
    });

    it('debe permitir la renovación (heartbeat) del lease por el mismo operador', async () => {
      const futuro = new Date(Date.now() + 5 * 60 * 1000); // vence en 5 min
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.EN_REVISION,
        operadorBloqueoId: OPERADOR_1,
        bloqueoExpiracion: futuro,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/lease')
        .send({ idOperador: OPERADOR_1 })
        .expect(HttpStatus.OK);

      expect(response.body.operadorBloqueoId).toBe(OPERADOR_1);
      expect(response.body.vigenciaMinutos).toBe(15);
    });

    it('debe permitir que un nuevo operador adquiera el lease si el anterior ya expiró', async () => {
      const expirado = new Date(Date.now() - 2 * 60 * 1000); // expiró hace 2 min
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.EN_REVISION,
        operadorBloqueoId: OPERADOR_1,
        bloqueoExpiracion: expirado,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/lease')
        .send({ idOperador: OPERADOR_2 })
        .expect(HttpStatus.OK);

      expect(response.body.operadorBloqueoId).toBe(OPERADOR_2);
      expect(response.body.vigenciaMinutos).toBe(15);
    });

    it('debe retornar 400 Bad Request si el idOperador no es un UUID válido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/lease')
        .send({ idOperador: 'no-es-uuid' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('debe retornar 404 Not Found si el caso solicitado no existe', async () => {
      prismaMock.caso.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-INEXISTENTE/lease')
        .send({ idOperador: OPERADOR_1 })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // =========================================================================
  // 4. Rechazo concurrente 409 Conflict
  // =========================================================================
  describe('Rechazo concurrente 409 Conflict', () => {
    it('debe responder 409 Conflict cuando otro operador tiene el lease vigente activo', async () => {
      const futuro = new Date(Date.now() + 10 * 60 * 1000); // activo por 10 min más
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.EN_REVISION,
        operadorBloqueoId: OPERADOR_1,
        bloqueoExpiracion: futuro,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-SEED-002/lease')
        .send({ idOperador: OPERADOR_2 })
        .expect(HttpStatus.CONFLICT);

      expect(response.body.message).toContain('bloqueado por otro operador');
    });

    it('debe responder 409 Conflict cuando el caso ya se encuentra en estado RESUELTO', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-RESUELTO-001',
        estadoCaso: EstadoCaso.RESUELTO,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/review-tray/cases/CASO-RESUELTO-001/lease')
        .send({ idOperador: OPERADOR_1 })
        .expect(HttpStatus.CONFLICT);

      expect(response.body.message).toContain('ya fue resuelto');
    });
  });

  // =========================================================================
  // 5. Transición a VENCIDO_ESCALADO cuando el SLA expira sin resolución
  // =========================================================================
  describe('Transición automática a VENCIDO_ESCALADO por expiración de SLA', () => {
    it('debe transicionar a VENCIDO_ESCALADO los casos cuyo SLA expiró sin resolución', async () => {
      const fechaExpirada = new Date(Date.now() - 3600 * 1000); // expiró hace 1 hora
      const ahora = new Date();

      prismaMock.caso.updateMany.mockResolvedValue({ count: 1 });

      const cantidadActualizada = await reviewTrayService.actualizarCasosVencidos(ahora);
      expect(cantidadActualizada).toBe(1);

      expect(prismaMock.caso.updateMany).toHaveBeenCalledWith({
        where: {
          estadoCaso: {
            in: [EstadoCaso.PENDIENTE_REVISION, EstadoCaso.EN_REVISION],
          },
          fechaVencimientoSLA: {
            lte: ahora,
          },
        },
        data: {
          estadoCaso: EstadoCaso.VENCIDO_ESCALADO,
        },
      });
    });

    it('debe mostrar estadoSLA = VENCIDO_ESCALADO y 0 horas restantes en la bandeja para casos vencidos', async () => {
      const fechaVencida = new Date(Date.now() - 24 * 3600 * 1000);
      const casosMock = [
        {
          idCaso: 'CASO-VENCIDO-001',
          fechaIngreso: new Date(Date.now() - 96 * 3600 * 1000),
          puntajeConfianza: 65,
          razonDerivacion: 'Plazo perentorio de 3 días hábiles superado',
          sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
          nivelPrioridad: NivelPrioridad.ALTA,
          causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
          fechaVencimientoSLA: fechaVencida,
          rutTitular: '10.111.222-3',
          nombreTitular: 'Ana Valenzuela Diaz',
          esAnonimizado: false,
          senales: [{ esAlertaFraude: false }],
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          operadorBloqueo: null,
        },
      ];

      prismaMock.caso.findMany.mockResolvedValue(casosMock);

      const response = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases?estado=VENCIDO_ESCALADO')
        .expect(HttpStatus.OK);

      const lista = response.body;
      expect(lista.length).toBe(1);
      expect(lista[0].idCaso).toBe('CASO-VENCIDO-001');
      expect(lista[0].tiempoRestanteHorasHabiles).toBe(0);
      expect(lista[0].estadoSLA).toBe('VENCIDO_ESCALADO');
    });
  });
});
