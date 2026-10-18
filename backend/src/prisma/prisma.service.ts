import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión a la base de datos PostgreSQL establecida exitosamente.');
    } catch (error) {
      this.logger.error('Error al conectar con la base de datos PostgreSQL:', error);
      // Permitir continuar en entornos de inicialización si es necesario
    }

    // RQNF-005 / PX-05: Enforzar patrón estrictamente append-only en Decision y AuditoriaUmbral
    this.$use(async (params, next) => {
      const model = params.model;
      const action = params.action;
      if (model === 'Decision' || model === 'AuditoriaUmbral') {
        if (
          action === 'update' ||
          action === 'updateMany' ||
          action === 'delete' ||
          action === 'deleteMany'
        ) {
          if (process.env.ALLOW_SEED_CLEANUP !== 'true') {
            throw new Error(
              `Operación inmutable violada: '${action}' sobre '${model}' está estrictamente prohibida por política append-only (PX-05, RQNF-005).`,
            );
          }
        }
      }
      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión a la base de datos PostgreSQL cerrada.');
  }
}
