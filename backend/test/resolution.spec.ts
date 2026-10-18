import { Test, TestingModule } from '@nestjs/testing';
import { ResolutionService } from '../src/review-tray/resolution.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { EstadoCaso, SugerenciaMIRA, TipoDecisionOperador } from '@prisma/client';
import { TipoDecisionEnum } from '../src/review-tray/dto/decision.dto';

describe('ResolutionService', () => {
  let service: ResolutionService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findUnique: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolutionService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ResolutionService>(ResolutionService);
  });

  describe('registrarDecision', () => {
    it('debe rechazar justificaciones con menos de 10 caracteres', async () => {
      await expect(
        service.registrarDecision('CASO-001', {
          idOperador: 'op-001',
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Corta',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar resolución si el caso ya fue resuelto previamente (first-to-submit)', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-001',
        estadoCaso: EstadoCaso.RESUELTO,
        decision: { idDecision: 'dec-1' },
      });

      await expect(
        service.registrarDecision('CASO-001', {
          idOperador: 'op-001',
          tipoDecision: TipoDecisionEnum.APROBADO,
          justificacion: 'Esta justificación cumple con el largo suficiente',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe registrar la decisión y marcar discrepancia si MIRA sugirió RECHAZAR pero el operador emitió APROBADO', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-003',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
        decision: null,
      });

      prismaMock.operador.findUnique.mockResolvedValue({
        idOperador: 'op-001',
        email: 'liquidador@mira.cl',
      });

      const fechaMock = new Date();
      prismaMock.decision.create.mockResolvedValue({
        idDecision: 'dec-nueva-001',
        idCaso: 'CASO-SEED-003',
        tipoDecision: TipoDecisionOperador.APROBADO,
        justificacion: 'Se verificó telefónicamente con el prestador emisor y no hay dolo.',
        marcaDiscrepancia: true,
        esInalterable: true,
        fechaDecision: fechaMock,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const resultado = await service.registrarDecision('CASO-SEED-003', {
        idOperador: 'op-001',
        tipoDecision: TipoDecisionEnum.APROBADO,
        justificacion: 'Se verificó telefónicamente con el prestador emisor y no hay dolo.',
      });

      expect(resultado.idCaso).toBe('CASO-SEED-003');
      expect(resultado.estadoCasoFinal).toBe('RESUELTO');
      expect(resultado.marcaDiscrepancia).toBe(true);
      expect(prismaMock.decision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            marcaDiscrepancia: true,
            esInalterable: true,
          }),
        }),
      );
    });

    it('debe registrar sin discrepancia cuando la decisión coincide con la sugerencia de MIRA', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        decision: null,
      });

      prismaMock.operador.findUnique.mockResolvedValue({
        idOperador: 'op-001',
        email: 'liquidador@mira.cl',
      });

      const fechaMock = new Date();
      prismaMock.decision.create.mockResolvedValue({
        idDecision: 'dec-nueva-002',
        idCaso: 'CASO-SEED-002',
        tipoDecision: TipoDecisionOperador.APROBADO,
        justificacion: 'El desfase de fechas es justificado según informe del médico tratante.',
        marcaDiscrepancia: false,
        esInalterable: true,
        fechaDecision: fechaMock,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const resultado = await service.registrarDecision('CASO-SEED-002', {
        idOperador: 'op-001',
        tipoDecision: TipoDecisionEnum.APROBADO,
        justificacion: 'El desfase de fechas es justificado según informe del médico tratante.',
      });

      expect(resultado.marcaDiscrepancia).toBe(false);
    });
  });
});
