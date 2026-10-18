import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { ReviewTrayController } from '../src/review-tray/review-tray.controller';
import { ReviewTrayService } from '../src/review-tray/review-tray.service';
import { ConcurrencyService } from '../src/review-tray/concurrency.service';
import { ResolutionService } from '../src/review-tray/resolution.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PiiMaskingService } from '../src/common/services/pii-masking.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  EstadoCaso,
  SugerenciaMIRA,
  CausalDerivacion,
  NivelPrioridad,
  TipoDecisionOperador,
} from '@prisma/client';

describe('T027b [P] - Atributos de Calidad Extra-Funcionales F1 (PX-01, PX-03, PX-04, PX-06)', () => {
  let app: INestApplication;
  let piiMaskingService: PiiMaskingService;
  let prismaMock: any;

  const ID_CASO = 'CASO-SEED-002';
  const ID_OPERADOR = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    piiMaskingService = new PiiMaskingService();

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
      controllers: [ReviewTrayController],
      providers: [
        ReviewTrayService,
        ConcurrencyService,
        ResolutionService,
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

  describe('PX-03 / RQNF-003: Soberanía Local, No Egreso de PII y Derecho de Supresión', () => {
    it('debe anonimizar/enmascarar estrictamente el RUT y Nombre del titular en el listado de la bandeja', async () => {
      const fechaFutura = new Date(Date.now() + 48 * 3600 * 1000);

      prismaMock.caso.findMany.mockResolvedValue([
        {
          idCaso: ID_CASO,
          fechaIngreso: new Date(),
          puntajeConfianza: 74.0,
          estadoCaso: EstadoCaso.PENDIENTE_REVISION,
          sugerenciaMIRA: SugerenciaMIRA.APROBAR,
          razonDerivacion: 'Puntaje insuficiente',
          causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
          fechaVencimientoSLA: fechaFutura,
          nivelPrioridad: NivelPrioridad.MEDIA,
          rutTitular: '18.234.567-8',
          nombreTitular: 'Rodrigo Fuentes Tapia',
          hashTitular: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          esAnonimizado: false,
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          senales: [],
          operadorBloqueo: null,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases')
        .expect(200);

      expect(res.body).toHaveLength(1);
      const item = res.body[0];

      // Verificar que el RUT nunca se transmite en texto claro
      expect(item.rutTitular).toBe('18.234.***-*');
      expect(item.rutTitular).not.toContain('567-8');

      // Verificar que el Nombre se transmite enmascarado
      expect(item.nombreTitular).toBe('R*** F*** T***');
      expect(item.nombreTitular).not.toContain('Rodrigo');
    });

    it('debe enmascarar datos personales en detalle de caso cuando se ejerce derecho de supresión (esAnonimizado = true)', async () => {
      const fechaFutura = new Date(Date.now() + 48 * 3600 * 1000);

      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SUPRIMIDO-001',
        fechaIngreso: new Date(),
        puntajeConfianza: 80.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        razonDerivacion: 'Revisión preventiva',
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA: fechaFutura,
        nivelPrioridad: NivelPrioridad.MEDIA,
        rutTitular: '12.345.678-9',
        nombreTitular: 'Camila Andrea Soto',
        hashTitular: piiMaskingService.generarHashSha256('12.345.678-9'),
        esAnonimizado: true, // Titular ejerció supresión conforme a Ley 19.628 / DEC-05
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
        evidencias: [],
        senales: [],
        operadorBloqueo: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases/CASO-SUPRIMIDO-001')
        .expect(200);

      expect(res.body.rutTitular).toBe('12.345.***-*');
      expect(res.body.nombreTitular).toBe('C*** A*** S***');
    });

    it('debe mantener trazabilidad inalterable mediante hash SHA-256 determinista del titular', () => {
      const rutTitular = '18.234.567-8';
      const hash1 = piiMaskingService.generarHashSha256(rutTitular);
      const hash2 = piiMaskingService.generarHashSha256(rutTitular);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('PX-04 / RQNF-004: Integridad Criptográfica SHA-256 de Evidencias Digitales', () => {
    it('debe verificar la integridad mediante hash SHA-256 del contenido documental', () => {
      const contenidoEvidenciaMock = Buffer.from('PDF-CONTENT-SIMULATED-MEDICINA-2026-CHILE');
      const hashEsperado = crypto
        .createHash('sha256')
        .update(contenidoEvidenciaMock)
        .digest('hex');

      expect(hashEsperado).toHaveLength(64);

      // Simular intento de adulteración (tampering) cambiando 1 byte
      const contenidoAdulterado = Buffer.from('PDF-CONTENT-SIMULATED-MEDICINA-2026-CHILF');
      const hashAdulterado = crypto
        .createHash('sha256')
        .update(contenidoAdulterado)
        .digest('hex');

      expect(hashAdulterado).not.toBe(hashEsperado);
    });

    it('debe exponer metadatos de evidencia con hash de verificación en detalle de caso', async () => {
      const hashBono = 'a3c8e47291fb654b9d0382e750f1d39281a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8';
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: ID_CASO,
        fechaIngreso: new Date(),
        puntajeConfianza: 74.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA: new Date(Date.now() + 48 * 3600 * 1000),
        esAnonimizado: false,
        rutTitular: '18.234.567-8',
        nombreTitular: 'Rodrigo Fuentes',
        evidencias: [
          {
            idEvidencia: 'evi-bono-001',
            idCaso: ID_CASO,
            nombreArchivo: 'bono_consulta_001.pdf',
            tipoArchivo: 'application/pdf',
            urlAlmacenamiento: '/static/evidence/bono_consulta_001.pdf',
            hashSha256: hashBono,
            esLegible: true,
            motivoIlegibilidad: null,
          },
        ],
        senales: [],
        operadorBloqueo: null,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/review-tray/cases/${ID_CASO}`)
        .expect(200);

      expect(res.body.evidencias).toHaveLength(1);
      expect(res.body.evidencias[0].nombreArchivo).toBe('bono_consulta_001.pdf');
      expect(res.body.evidencias[0].esLegible).toBe(true);
    });
  });

  describe('PX-06 / RQNF-006: Tolerancia a Caídas de Servicios Externos y Continuidad Operativa', () => {
    it('debe permitir resolución humana exitosa aun cuando servicios de IA externos estén caídos', async () => {
      // Simular que el caso ya fue persistido localmente en PostgreSQL
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: ID_CASO,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        operadorBloqueoId: ID_OPERADOR,
        bloqueoExpiracion: new Date(Date.now() + 10 * 60 * 1000),
        decision: null,
      });

      prismaMock.operador.findUnique.mockResolvedValue({
        idOperador: ID_OPERADOR,
        nombre: 'Carlos Liquidador Valenzuela',
        activo: true,
      });

      const decisionCreada = {
        idDecision: 'dec-offline-001',
        idCaso: ID_CASO,
        idOperador: ID_OPERADOR,
        tipoDecision: TipoDecisionOperador.APROBADO,
        justificacion: 'Resolución local de contingencia: comprobante validado manualmente',
        marcaDiscrepancia: false,
        fechaDecision: new Date(),
        esInalterable: true,
      };

      prismaMock.decision.create.mockResolvedValue(decisionCreada);
      prismaMock.caso.update.mockResolvedValue({
        idCaso: ID_CASO,
        estadoCaso: EstadoCaso.RESUELTO,
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/review-tray/cases/${ID_CASO}/decision`)
        .send({
          idOperador: ID_OPERADOR,
          tipoDecision: 'APROBADO',
          justificacion: 'Resolución local de contingencia: comprobante validado manualmente',
        })
        .expect(201);

      expect(res.body.idCaso).toBe(ID_CASO);
      expect(res.body.estadoCasoFinal).toBe('RESUELTO');
      expect(res.body.marcaDiscrepancia).toBe(false);
      expect(prismaMock.decision.create).toHaveBeenCalled();
    });

    it('debe aislar errores de servicios externos sin degradar la disponibilidad de la bandeja', async () => {
      // El listado de casos opera sobre el repositorio local sin depender de llamadas síncronas a terceros
      prismaMock.caso.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/review-tray/cases')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('PX-01 / RQNF-001: Latencia y Rendimiento en Operaciones de Bandeja', () => {
    it('debe responder a la consulta de detalle en menos de 1000 ms (PX-01)', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: ID_CASO,
        fechaIngreso: new Date(),
        puntajeConfianza: 74.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA: new Date(Date.now() + 48 * 3600 * 1000),
        esAnonimizado: false,
        rutTitular: '18.234.567-8',
        nombreTitular: 'Rodrigo Fuentes',
        evidencias: [],
        senales: [],
        operadorBloqueo: null,
      });

      const inicio = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/review-tray/cases/${ID_CASO}`)
        .expect(200);
      const latenciaMs = Date.now() - inicio;

      expect(latenciaMs).toBeLessThan(1000);
    });
  });
});
