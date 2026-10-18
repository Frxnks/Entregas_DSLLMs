import { Test, TestingModule } from '@nestjs/testing';
import { ConcurrencyService } from '../src/review-tray/concurrency.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoCaso } from '@prisma/client';

describe('ConcurrencyService', () => {
  let service: ConcurrencyService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcurrencyService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ConcurrencyService>(ConcurrencyService);
  });

  describe('adquirirOExtenderLease', () => {
    it('debe lanzar NotFoundException si el caso no existe', async () => {
      prismaMock.caso.findUnique.mockResolvedValue(null);

      await expect(service.adquirirOExtenderLease('CASO-INEXISTENTE', 'op-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si el caso ya está resuelto', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-001',
        estadoCaso: EstadoCaso.RESUELTO,
      });

      await expect(service.adquirirOExtenderLease('CASO-001', 'op-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar ConflictException si otro operador tiene un lease activo no expirado', async () => {
      const futuro = new Date(Date.now() + 10 * 60 * 1000);
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-001',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        operadorBloqueoId: 'op-OTRO',
        bloqueoExpiracion: futuro,
      });

      await expect(service.adquirirOExtenderLease('CASO-001', 'op-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe asignar el lease por 15 minutos y actualizar a EN_REVISION si no hay bloqueo', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-001',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        operadorBloqueoId: null,
        bloqueoExpiracion: null,
      });
      prismaMock.caso.update.mockResolvedValue({});

      const resultado = await service.adquirirOExtenderLease('CASO-001', 'op-001');

      expect(resultado.idCaso).toBe('CASO-001');
      expect(resultado.operadorBloqueoId).toBe('op-001');
      expect(resultado.vigenciaMinutos).toBe(15);
      expect(prismaMock.caso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idCaso: 'CASO-001' },
          data: expect.objectContaining({
            operadorBloqueoId: 'op-001',
            estadoCaso: EstadoCaso.EN_REVISION,
          }),
        }),
      );
    });
  });

  describe('liberarLease', () => {
    it('debe liberar el lease y retornar el caso a PENDIENTE_REVISION si correspondía al operador', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-001',
        estadoCaso: EstadoCaso.EN_REVISION,
        operadorBloqueoId: 'op-001',
      });
      prismaMock.caso.update.mockResolvedValue({});

      await service.liberarLease('CASO-001', 'op-001');

      expect(prismaMock.caso.update).toHaveBeenCalledWith({
        where: { idCaso: 'CASO-001' },
        data: {
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          estadoCaso: EstadoCaso.PENDIENTE_REVISION,
        },
      });
    });
  });
});
