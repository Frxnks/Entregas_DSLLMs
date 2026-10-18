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
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión a la base de datos PostgreSQL cerrada.');
  }
}
