import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewTrayService } from '../src/review-tray/review-tray.service';
import { ReviewTrayController } from '../src/review-tray/review-tray.controller';
import { ConcurrencyService } from '../src/review-tray/concurrency.service';
import { ResolutionService } from '../src/review-tray/resolution.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PiiMaskingService } from '../src/common/services/pii-masking.service';
import { ChileanCalendarUtil } from '../src/common/utils/chilean-calendar.util';
import {
  EstadoCaso,
  SugerenciaMIRA,
  CausalDerivacion,
  NivelPrioridad,
} from '@prisma/client';

describe('Detalle de Caso y Hallazgos Espaciales (US1 - T010)', () => {
  let service: ReviewTrayService;
  let controller: ReviewTrayController;
  let prismaMock: any;
  let piiMaskingService: PiiMaskingService;

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewTrayController],
      providers: [
        ReviewTrayService,
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
          provide: ResolutionService,
          useValue: {
            registrarDecision: jest.fn(),
            obtenerDiscrepancias: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewTrayService>(ReviewTrayService);
    controller = module.get<ReviewTrayController>(ReviewTrayController);
    piiMaskingService = module.get<PiiMaskingService>(PiiMaskingService);
  });

  describe('ReviewTrayService.obtenerDetalleCaso (Unit)', () => {
    it('debe lanzar NotFoundException cuando el caso solicitado no existe (T012)', async () => {
      prismaMock.caso.findUnique.mockResolvedValue(null);

      await expect(service.obtenerDetalleCaso('CASO-INEXISTENTE')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.caso.findUnique).toHaveBeenCalledWith({
        where: { idCaso: 'CASO-INEXISTENTE' },
        include: {
          evidencias: true,
          senales: true,
          operadorBloqueo: true,
        },
      });
    });

    it('debe retornar el detalle integral del caso con mapeo de evidencia y hallazgos espaciales (bounding boxes) (RQF-009, RQF-020)', async () => {
      const fechaIngreso = new Date('2026-10-17T10:00:00.000Z');
      const fechaSLA = new Date('2026-10-20T18:30:00.000Z');

      const mockCasoDb = {
        idCaso: 'CASO-SEED-002',
        idFlujo: 'flujo-reembolso-gastos-medicos',
        fechaIngreso,
        puntajeConfianza: 74.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        razonDerivacion:
          'Puntaje global insuficiente (74/100) inferior al umbral de aprobación automática configurado (90 puntos).',
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA: fechaSLA,
        nivelPrioridad: NivelPrioridad.MEDIA,
        rutTitular: '18.234.567-8',
        nombreTitular: 'Rodrigo Fuentes Tapia',
        esAnonimizado: false,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
        operadorBloqueo: null,
        evidencias: [
          {
            idEvidencia: 'evi-seed-002',
            idCaso: 'CASO-SEED-002',
            nombreArchivo: 'bono_desfase_002.pdf',
            tipoArchivo: 'PDF',
            urlAlmacenamiento: '/static/evidence/bono_desfase_002.pdf',
            hashSha256: 'de8f52a47f51ac2dde1c6426f98860492ce59db156b4e90e710c43d5b543be71',
            esLegible: true,
            motivoIlegibilidad: null,
          },
        ],
        senales: [
          {
            idSenal: 'sen-seed-002-2',
            idCaso: 'CASO-SEED-002',
            idEvidencia: 'evi-seed-002',
            tipoSenal: 'COHERENCIA_FECHAS',
            moduloOrigen: 'analizador_fechas_v1',
            puntaje: 65.0,
            pesoPonderacion: 0.35,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            resultado: 'ADVERSO',
            descripcion:
              'Desfase temporal de 45 días entre la consulta médica y la emisión del comprobante',
            ubicacionHallazgo: { page: 1, x: 120, y: 450, width: 280, height: 60 },
          },
        ],
      };

      prismaMock.caso.findUnique.mockResolvedValue(mockCasoDb);

      const detalle = await service.obtenerDetalleCaso('CASO-SEED-002');

      expect(detalle).toBeDefined();
      expect(detalle.idCaso).toBe('CASO-SEED-002');
      expect(detalle.puntajeConfianza).toBe(74.0);
      expect(detalle.estadoCaso).toBe(EstadoCaso.PENDIENTE_REVISION);
      expect(detalle.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(detalle.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(detalle.tiempoRestanteHorasHabiles).toBeGreaterThan(0);
      expect(detalle.estadoSLA).toBeDefined();
      expect(detalle.rutTitular).toBe('18.234.567-8');
      expect(detalle.nombreTitular).toBe('Rodrigo Fuentes Tapia');

      // Verificación de evidencias
      expect(detalle.evidencias).toHaveLength(1);
      expect(detalle.evidencias[0]).toEqual({
        idEvidencia: 'evi-seed-002',
        nombreArchivo: 'bono_desfase_002.pdf',
        tipoArchivo: 'PDF',
        urlAlmacenamiento: '/static/evidence/bono_desfase_002.pdf',
        esLegible: true,
        motivoIlegibilidad: null,
      });

      // Verificación de señales y hallazgos espaciales (bounding box)
      expect(detalle.senales).toHaveLength(1);
      const senal = detalle.senales[0];
      expect(senal.idSenal).toBe('sen-seed-002-2');
      expect(senal.idEvidencia).toBe('evi-seed-002');
      expect(senal.tipoSenal).toBe('COHERENCIA_FECHAS');
      expect(senal.moduloOrigen).toBe('analizador_fechas_v1');
      expect(senal.puntaje).toBe(65.0);
      expect(senal.ubicacionHallazgo).toEqual({
        page: 1,
        x: 120,
        y: 450,
        width: 280,
        height: 60,
      });
    });

    it('debe manejar adecuadamente evidencias no legibles sin bloquear la consulta (RQF-002)', async () => {
      const mockCasoIlegible = {
        idCaso: 'CASO-ILEGIBLE-001',
        idFlujo: 'flujo-001',
        fechaIngreso: new Date(),
        puntajeConfianza: 50.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.SOLICITAR_ANTECEDENTES,
        razonDerivacion: 'Documento adjunto con fallas críticas de legibilidad.',
        causalDerivacion: CausalDerivacion.MINIMO_SENAL,
        fechaVencimientoSLA: new Date(Date.now() + 24 * 3600 * 1000),
        nivelPrioridad: NivelPrioridad.ALTA,
        rutTitular: '19.876.543-2',
        nombreTitular: 'Camila Soto Valenzuela',
        esAnonimizado: false,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
        operadorBloqueo: null,
        evidencias: [
          {
            idEvidencia: 'evi-ilegible-001',
            idCaso: 'CASO-ILEGIBLE-001',
            nombreArchivo: 'receta_borrosa.jpg',
            tipoArchivo: 'IMAGEN_JPG',
            urlAlmacenamiento: '/static/evidence/receta_borrosa.jpg',
            hashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            esLegible: false,
            motivoIlegibilidad: 'Imagen desenfocada o baja resolución (RQF-002)',
          },
        ],
        senales: [],
      };

      prismaMock.caso.findUnique.mockResolvedValue(mockCasoIlegible);

      const detalle = await service.obtenerDetalleCaso('CASO-ILEGIBLE-001');

      expect(detalle.evidencias[0].esLegible).toBe(false);
      expect(detalle.evidencias[0].motivoIlegibilidad).toBe(
        'Imagen desenfocada o baja resolución (RQF-002)',
      );
    });

    it('debe enmascarar PII (RUT y nombre) cuando el caso está anonimizado (DEC-05, DEC-06)', async () => {
      const mockCasoAnonimizado = {
        idCaso: 'CASO-ANON-001',
        idFlujo: 'flujo-001',
        fechaIngreso: new Date(),
        puntajeConfianza: 85.0,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        razonDerivacion: 'Revisión preventiva.',
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA: new Date(Date.now() + 24 * 3600 * 1000),
        nivelPrioridad: NivelPrioridad.MEDIA,
        rutTitular: '12.345.678-9',
        nombreTitular: 'Juan Perez Gonzalez',
        esAnonimizado: true, // Supresión / anonimización activada
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
        operadorBloqueo: null,
        evidencias: [],
        senales: [],
      };

      prismaMock.caso.findUnique.mockResolvedValue(mockCasoAnonimizado);

      const detalle = await service.obtenerDetalleCaso('CASO-ANON-001');

      expect(detalle.rutTitular).toBe(piiMaskingService.enmascararRut('12.345.678-9'));
      expect(detalle.nombreTitular).toBe(piiMaskingService.enmascararNombre('Juan Perez Gonzalez'));
      expect(detalle.rutTitular).not.toBe('12.345.678-9');
    });

    it('debe reflejar el estado del arriendo temporal (lease) si un operador lo tiene bloqueado (RQF-024)', async () => {
      const expiracionFutura = new Date(Date.now() + 12 * 60 * 1000); // Vence en 12 min
      const mockCasoConLease = {
        idCaso: 'CASO-BLOQUEADO-001',
        idFlujo: 'flujo-001',
        fechaIngreso: new Date(),
        puntajeConfianza: 68.0,
        estadoCaso: EstadoCaso.EN_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
        razonDerivacion: 'En revisión activa por liquidador.',
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        fechaVencimientoSLA: new Date(Date.now() + 24 * 3600 * 1000),
        nivelPrioridad: NivelPrioridad.ALTA,
        rutTitular: '17.654.321-0',
        nombreTitular: 'Ana Torres Valdés',
        esAnonimizado: false,
        operadorBloqueoId: 'op-liquidador-007',
        bloqueoExpiracion: expiracionFutura,
        operadorBloqueo: {
          nombre: 'Carlos Liquidador Valenzuela',
          email: 'liquidador@mira.cl',
        },
        evidencias: [],
        senales: [],
      };

      prismaMock.caso.findUnique.mockResolvedValue(mockCasoConLease);

      const detalle = await service.obtenerDetalleCaso('CASO-BLOQUEADO-001');

      expect(detalle.bloqueadoPor).toBe('Carlos Liquidador Valenzuela');
      expect(detalle.operadorBloqueoId).toBe('op-liquidador-007');
      expect(detalle.bloqueoExpiracion).toBe(expiracionFutura.toISOString());
    });
  });

  describe('ReviewTrayController.getCaseDetail (Integration)', () => {
    it('debe despachar la consulta al servicio y responder exitosamente con el DTO mapeado', async () => {
      const mockDto: any = {
        idCaso: 'CASO-SEED-003',
        puntajeConfianza: 75.9,
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
        razonDerivacion: 'Alerta de fraude activa en imagen de boleta',
        causalDerivacion: CausalDerivacion.FRAUDE,
        senales: [
          {
            idSenal: 'sen-003-3',
            tipoSenal: 'FRAUDE_MANIPULACION',
            esAlertaFraude: true,
            ubicacionHallazgo: { page: 1, x: 310, y: 520, width: 140, height: 45 },
          },
        ],
      };

      jest.spyOn(service, 'obtenerDetalleCaso').mockResolvedValue(mockDto);

      const result = await controller.getCaseDetail('CASO-SEED-003');

      expect(result).toBe(mockDto);
      expect(service.obtenerDetalleCaso).toHaveBeenCalledWith('CASO-SEED-003');
    });

    it('debe propagar NotFoundException cuando el caso no existe', async () => {
      jest
        .spyOn(service, 'obtenerDetalleCaso')
        .mockRejectedValue(new NotFoundException('No existe'));

      await expect(controller.getCaseDetail('CASO-NO-EXISTE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
