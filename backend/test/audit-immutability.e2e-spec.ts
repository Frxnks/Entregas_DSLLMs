import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { TipoDecisionOperador } from '@prisma/client';

describe('T027 [P] - Auditoría Inmutable Append-Only (PX-05 / RQNF-005)', () => {
  let prismaService: PrismaService;
  let middlewareHandler: (params: any, next: (params: any) => Promise<any>) => Promise<any>;

  beforeEach(async () => {
    delete process.env.ALLOW_SEED_CLEANUP;

    prismaService = new PrismaService();

    // Capturar la función de middleware registrada por $use
    const originalUse = prismaService.$use.bind(prismaService);
    jest.spyOn(prismaService, '$use').mockImplementation((fn: any) => {
      middlewareHandler = fn;
      return originalUse(fn);
    });

    // Simular $connect para inicializar el middleware sin requerir base de datos física
    jest.spyOn(prismaService, '$connect').mockResolvedValue(undefined);

    await prismaService.onModuleInit();
  });

  afterEach(async () => {
    delete process.env.ALLOW_SEED_CLEANUP;
  });

  describe('Inmutabilidad de Decisiones Humanas (Modelo Decision)', () => {
    it('debe rechazar estrictamente cualquier intento de actualización (update) sobre Decision', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'Decision',
        action: 'update',
        args: {
          where: { idDecision: 'dec-001' },
          data: { justificacion: 'Texto adulterado' },
        },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'update' sobre 'Decision' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar estrictamente cualquier intento de actualización masiva (updateMany) sobre Decision', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'Decision',
        action: 'updateMany',
        args: {
          where: { marcaDiscrepancia: true },
          data: { marcaDiscrepancia: false },
        },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'updateMany' sobre 'Decision' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar estrictamente cualquier intento de eliminación (delete) sobre Decision', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'Decision',
        action: 'delete',
        args: {
          where: { idDecision: 'dec-001' },
        },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'delete' sobre 'Decision' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar estrictamente cualquier intento de depuración masiva (deleteMany) sobre Decision', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'Decision',
        action: 'deleteMany',
        args: {
          where: {},
        },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'deleteMany' sobre 'Decision' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe permitir operaciones de inserción append-only (create) sobre Decision', async () => {
      const nextMock = jest.fn().mockResolvedValue({
        idDecision: 'dec-nuevo',
        idCaso: 'CASO-001',
        tipoDecision: TipoDecisionOperador.APROBADO,
      });

      const params = {
        model: 'Decision',
        action: 'create',
        args: {
          data: {
            idCaso: 'CASO-001',
            idOperador: 'op-001',
            tipoDecision: TipoDecisionOperador.APROBADO,
            justificacion: 'Aprobado según boleta médica',
          },
        },
      };

      const result = await middlewareHandler(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result.idDecision).toBe('dec-nuevo');
    });

    it('debe permitir consultas de lectura (findUnique / findMany) para auditoría legal', async () => {
      const nextMock = jest.fn().mockResolvedValue([
        { idDecision: 'dec-001', tipoDecision: TipoDecisionOperador.RECHAZADO },
      ]);

      const params = {
        model: 'Decision',
        action: 'findMany',
        args: { where: { marcaDiscrepancia: true } },
      };

      const result = await middlewareHandler(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(1);
    });
  });

  describe('Inmutabilidad de Calibración de Umbrales (Modelo AuditoriaUmbral)', () => {
    it('debe rechazar modificaciones (update) sobre AuditoriaUmbral asegurando trazabilidad regulatoria', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'update',
        args: {
          where: { idAuditoria: 'aud-001' },
          data: { valorAprobacionNuevo: 50.0 },
        },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'update' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar eliminación (delete) sobre AuditoriaUmbral incluso ante solicitudes de administrador', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'delete',
        args: {
          where: { idAuditoria: 'aud-001' },
        },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'delete' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe rechazar borrado masivo (deleteMany) sobre AuditoriaUmbral', async () => {
      const nextMock = jest.fn();
      const params = {
        model: 'AuditoriaUmbral',
        action: 'deleteMany',
        args: { where: {} },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada: 'deleteMany' sobre 'AuditoriaUmbral' está estrictamente prohibida por política append-only \(PX-05, RQNF-005\)\./,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('debe permitir inserción append-only (create) de nuevas calibraciones de umbral', async () => {
      const nextMock = jest.fn().mockResolvedValue({
        idAuditoria: 'aud-002',
        idFlujo: 'flujo-001',
        valorAprobacionNuevo: 88.0,
      });

      const params = {
        model: 'AuditoriaUmbral',
        action: 'create',
        data: {
          idFlujo: 'flujo-001',
          valorAprobacionAnterior: 90.0,
          valorAprobacionNuevo: 88.0,
          minimoBasalAnterior: 60.0,
          minimoBasalNuevo: 60.0,
          usuarioModificador: 'admin.riesgo@aseguradora.cl',
        },
      };

      const result = await middlewareHandler(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result.idAuditoria).toBe('aud-002');
    });
  });

  describe('Control Excepcional de Semillas (ALLOW_SEED_CLEANUP)', () => {
    it('solo permite mutaciones cuando ALLOW_SEED_CLEANUP es estrictamente "true"', async () => {
      process.env.ALLOW_SEED_CLEANUP = 'true';
      const nextMock = jest.fn().mockResolvedValue({ count: 5 });

      const params = {
        model: 'Decision',
        action: 'deleteMany',
        args: {},
      };

      const result = await middlewareHandler(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result.count).toBe(5);
    });

    it('bloquea mutaciones si ALLOW_SEED_CLEANUP es cualquier otro valor ("false", "1", undefined)', async () => {
      process.env.ALLOW_SEED_CLEANUP = 'false';
      const nextMock = jest.fn();

      const params = {
        model: 'AuditoriaUmbral',
        action: 'delete',
        args: { where: { idAuditoria: 'aud-001' } },
      };

      await expect(middlewareHandler(params, nextMock)).rejects.toThrow(
        /Operación inmutable violada/,
      );
      expect(nextMock).not.toHaveBeenCalled();
    });
  });

  describe('Comprobación de Otros Modelos Mutables', () => {
    it('permite operaciones de update y delete en entidades transaccionales no inmutables (ej. Caso, Umbral)', async () => {
      const nextMock = jest.fn().mockResolvedValue({ idCaso: 'CASO-001', estadoCaso: 'EN_REVISION' });

      const params = {
        model: 'Caso',
        action: 'update',
        args: {
          where: { idCaso: 'CASO-001' },
          data: { estadoCaso: 'EN_REVISION' },
        },
      };

      const result = await middlewareHandler(params, nextMock);
      expect(nextMock).toHaveBeenCalledWith(params);
      expect(result.estadoCaso).toBe('EN_REVISION');
    });
  });
});
