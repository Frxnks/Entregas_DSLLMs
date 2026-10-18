import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseResponseDto } from './dto/lease.dto';
import { EstadoCaso } from '@prisma/client';

@Injectable()
export class ConcurrencyService {
  private readonly logger = new Logger(ConcurrencyService.name);
  public static readonly DURACION_LEASE_MINUTOS = 15;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adquiere o renueva el arriendo temporal de edición (lease de 15 min) sobre un caso (RQF-024).
   */
  async adquirirOExtenderLease(idCaso: string, idOperador: string): Promise<LeaseResponseDto> {
    const caso = await this.prisma.caso.findUnique({
      where: { idCaso },
    });

    if (!caso) {
      throw new NotFoundException(`El caso con identificador ${idCaso} no existe.`);
    }

    if (caso.estadoCaso === EstadoCaso.RESUELTO) {
      throw new ConflictException(
        `El caso ${idCaso} ya fue resuelto y no admite bloqueos de edición.`,
      );
    }

    const ahora = new Date();

    // Validar si el caso está actualmente bloqueado por otro operador
    if (
      caso.operadorBloqueoId &&
      caso.operadorBloqueoId !== idOperador &&
      caso.bloqueoExpiracion &&
      caso.bloqueoExpiracion > ahora
    ) {
      throw new ConflictException(
        `El caso se encuentra actualmente bloqueado por otro operador hasta las ${caso.bloqueoExpiracion.toLocaleTimeString('es-CL')}. Modo sólo lectura activo.`,
      );
    }

    // Calcular nueva fecha de expiración a 15 minutos
    const nuevaExpiracion = new Date(
      ahora.getTime() + ConcurrencyService.DURACION_LEASE_MINUTOS * 60 * 1000,
    );

    const estadoActualizado =
      caso.estadoCaso === EstadoCaso.PENDIENTE_REVISION ? EstadoCaso.EN_REVISION : caso.estadoCaso;

    await this.prisma.caso.update({
      where: { idCaso },
      data: {
        operadorBloqueoId: idOperador,
        bloqueoExpiracion: nuevaExpiracion,
        estadoCaso: estadoActualizado,
      },
    });

    this.logger.log(
      `Lease de ${ConcurrencyService.DURACION_LEASE_MINUTOS} min asignado al operador ${idOperador} para el caso ${idCaso}`,
    );

    return {
      idCaso,
      operadorBloqueoId: idOperador,
      bloqueoExpiracion: nuevaExpiracion.toISOString(),
      vigenciaMinutos: ConcurrencyService.DURACION_LEASE_MINUTOS,
    };
  }

  /**
   * Libera voluntariamente el lease de edición de un caso.
   */
  async liberarLease(idCaso: string, idOperador: string): Promise<void> {
    const caso = await this.prisma.caso.findUnique({
      where: { idCaso },
    });

    if (!caso) return;

    if (caso.operadorBloqueoId === idOperador) {
      const nuevoEstado =
        caso.estadoCaso === EstadoCaso.EN_REVISION
          ? EstadoCaso.PENDIENTE_REVISION
          : caso.estadoCaso;

      await this.prisma.caso.update({
        where: { idCaso },
        data: {
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
          estadoCaso: nuevoEstado,
        },
      });

      this.logger.log(`Lease del caso ${idCaso} liberado por el operador ${idOperador}`);
    }
  }

  /**
   * Verifica si un caso tiene un bloqueo activo no expirado.
   */
  async esCasoBloqueado(idCaso: string, idOperadorActual?: string): Promise<boolean> {
    const caso = await this.prisma.caso.findUnique({
      where: { idCaso },
    });

    if (!caso || !caso.operadorBloqueoId || !caso.bloqueoExpiracion) {
      return false;
    }

    const expirado = caso.bloqueoExpiracion <= new Date();
    if (expirado) return false;

    if (idOperadorActual && caso.operadorBloqueoId === idOperadorActual) {
      return false;
    }

    return true;
  }
}
