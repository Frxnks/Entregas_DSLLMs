import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ThresholdResponseDto } from './dto/threshold-response.dto';

@Injectable()
export class ThresholdService {
  private readonly logger = new Logger(ThresholdService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consulta el umbral de aprobación y mínimos basales vigentes de un flujo (RQF-006, DEC-11).
   */
  async obtenerUmbral(idFlujo: string): Promise<ThresholdResponseDto> {
    const flujo = await this.prisma.flujo.findUnique({
      where: { idFlujo },
      include: {
        umbral: true,
      },
    });

    if (!flujo) {
      throw new NotFoundException(`Flujo con ID ${idFlujo} no encontrado.`);
    }

    const umbral = flujo.umbral ?? (await this.prisma.umbral.findUnique({ where: { idFlujo } }));

    if (!umbral) {
      throw new NotFoundException(
        `Configuración de umbral para el flujo con ID ${idFlujo} no encontrada.`,
      );
    }

    return {
      idFlujo: umbral.idFlujo,
      valorAprobacion: umbral.valorAprobacion,
      minimoBasalSeguridad: umbral.minimoBasalSeguridad,
      version: umbral.version,
      fechaActualizacion: typeof umbral.fechaActualizacion === 'string'
        ? umbral.fechaActualizacion
        : umbral.fechaActualizacion.toISOString(),
    };
  }

  async obtenerUmbrales(idFlujo: string): Promise<ThresholdResponseDto> {
    return this.obtenerUmbral(idFlujo);
  }

  /**
   * Actualiza el umbral de aprobación y mínimos basales de un flujo de manera transaccional,
   * incrementando secuencialmente la versión y persistiendo el registro inmutable en AuditoriaUmbral (RQF-006, RQNF-005, DEC-05).
   */
  async actualizarUmbral(
    idFlujo: string,
    dto: UpdateThresholdDto,
  ): Promise<ThresholdResponseDto> {
    const flujo = await this.prisma.flujo.findUnique({
      where: { idFlujo },
      include: {
        umbral: true,
      },
    });

    if (!flujo) {
      throw new NotFoundException(`Flujo con ID ${idFlujo} no encontrado.`);
    }

    const umbralActual = flujo.umbral ?? (await this.prisma.umbral.findUnique({ where: { idFlujo } }));

    if (!umbralActual) {
      throw new NotFoundException(
        `Configuración de umbral para el flujo con ID ${idFlujo} no encontrada.`,
      );
    }

    const valorAprobacionAnterior = umbralActual.valorAprobacion;
    const minimoBasalAnterior = umbralActual.minimoBasalSeguridad;
    const valorAprobacionNuevo = dto.valorAprobacion;
    const minimoBasalNuevo =
      dto.minimoBasalSeguridad !== undefined && dto.minimoBasalSeguridad !== null
        ? dto.minimoBasalSeguridad
        : umbralActual.minimoBasalSeguridad;
    const nuevaVersion = umbralActual.version + 1;

    // Transacción atómica: actualizar umbral y registrar auditoría inmutable append-only
    const [umbralActualizado] = await this.prisma.$transaction([
      this.prisma.umbral.update({
        where: { idFlujo },
        data: {
          valorAprobacion: valorAprobacionNuevo,
          minimoBasalSeguridad: minimoBasalNuevo,
          version: nuevaVersion,
        },
      }),
      this.prisma.auditoriaUmbral.create({
        data: {
          idFlujo,
          valorAprobacionAnterior,
          valorAprobacionNuevo,
          minimoBasalAnterior,
          minimoBasalNuevo,
          usuarioModificador: dto.usuarioModificador,
        },
      }),
    ]);

    this.logger.log(
      `Umbral del flujo ${idFlujo} actualizado a v${nuevaVersion} por ${dto.usuarioModificador}: aprobación ${valorAprobacionAnterior} -> ${valorAprobacionNuevo}, basal ${minimoBasalAnterior} -> ${minimoBasalNuevo}`,
    );

    return {
      idFlujo: umbralActualizado.idFlujo,
      valorAprobacion: umbralActualizado.valorAprobacion,
      minimoBasalSeguridad: umbralActualizado.minimoBasalSeguridad,
      version: umbralActualizado.version,
      fechaActualizacion: typeof umbralActualizado.fechaActualizacion === 'string'
        ? umbralActualizado.fechaActualizacion
        : umbralActualizado.fechaActualizacion.toISOString(),
    };
  }

  async actualizarUmbrales(
    idFlujo: string,
    dto: UpdateThresholdDto,
  ): Promise<ThresholdResponseDto> {
    return this.actualizarUmbral(idFlujo, dto);
  }

  /**
   * Consulta el historial inmutable de auditoría de calibración de umbrales para un flujo (RQNF-005, DEC-05).
   */
  async obtenerAuditoriasPorFlujo(idFlujo: string) {
    const flujo = await this.prisma.flujo.findUnique({
      where: { idFlujo },
    });

    if (!flujo) {
      throw new NotFoundException(`Flujo con ID ${idFlujo} no encontrado.`);
    }

    return this.prisma.auditoriaUmbral.findMany({
      where: { idFlujo },
      orderBy: {
        fechaModificacion: 'desc',
      },
    });
  }
}
