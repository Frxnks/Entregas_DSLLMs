import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaseSummaryDto } from './dto/case-summary.dto';
import { CaseDetailDto } from './dto/case-detail.dto';
import { ChileanCalendarUtil } from '../common/utils/chilean-calendar.util';
import { PiiMaskingService } from '../common/services/pii-masking.service';
import { EstadoCaso, NivelPrioridad } from '@prisma/client';

@Injectable()
export class ReviewTrayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly piiMaskingService: PiiMaskingService,
  ) {}

  /**
   * Actualiza a VENCIDO_ESCALADO los casos cuyo SLA expiró sin resolución (RQF-021).
   */
  async actualizarCasosVencidos(ahora: Date = new Date()): Promise<number> {
    if (!this.prisma.caso.updateMany) {
      return 0;
    }
    const res = await this.prisma.caso.updateMany({
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
    return res.count;
  }

  /**
   * Obtiene la lista de casos derivados para la bandeja de revisión asistida (RQF-008, RQF-021, RQF-024).
   */
  async listarCasos(estado?: EstadoCaso, prioridad?: NivelPrioridad): Promise<CaseSummaryDto[]> {
    const ahora = new Date();
    await this.actualizarCasosVencidos(ahora);

    const casos = await this.prisma.caso.findMany({
      where: {
        ...(estado
          ? { estadoCaso: estado }
          : {
              estadoCaso: {
                in: [
                  EstadoCaso.PENDIENTE_REVISION,
                  EstadoCaso.EN_REVISION,
                  EstadoCaso.VENCIDO_ESCALADO,
                ],
              },
            }),
        ...(prioridad ? { nivelPrioridad: prioridad } : {}),
      },
      include: {
        senales: {
          select: { esAlertaFraude: true },
        },
        operadorBloqueo: {
          select: { nombre: true, email: true },
        },
      },
      orderBy: [
        { nivelPrioridad: 'asc' }, // ALTA primero según convención o enum
        { fechaVencimientoSLA: 'asc' },
      ],
    });

    const prioridadPeso: Record<string, number> = {
      ALTA: 1,
      MEDIA: 2,
      BAJA: 3,
    };

    const casosOrdenados = [...casos].sort((a, b) => {
      const pesoA = prioridadPeso[a.nivelPrioridad] ?? 99;
      const pesoB = prioridadPeso[b.nivelPrioridad] ?? 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return new Date(a.fechaVencimientoSLA).getTime() - new Date(b.fechaVencimientoSLA).getTime();
    });

    return casosOrdenados.map((caso) => {
      const horasRestantes = ChileanCalendarUtil.calcularHorasHabilesRestantes(
        ahora,
        caso.fechaVencimientoSLA,
      );
      const estadoSLA = ChileanCalendarUtil.determinarEstadoSLA(horasRestantes);
      const tieneFraude =
        caso.senales?.some((s) => s.esAlertaFraude) || caso.causalDerivacion === 'FRAUDE';

      const leaseActivo =
        caso.operadorBloqueoId && caso.bloqueoExpiracion && caso.bloqueoExpiracion > ahora;

      const rutMostrado = this.piiMaskingService.enmascararRut(caso.rutTitular);
      const nombreMostrado = this.piiMaskingService.enmascararNombre(caso.nombreTitular);

      return {
        idCaso: caso.idCaso,
        fechaIngreso: caso.fechaIngreso.toISOString(),
        puntajeConfianza: caso.puntajeConfianza,
        razonDerivacion: caso.razonDerivacion || 'Derivado a revisión asistida',
        sugerenciaMIRA: caso.sugerenciaMIRA,
        nivelPrioridad: caso.nivelPrioridad,
        alertaFraude: tieneFraude,
        tiempoRestanteHorasHabiles: horasRestantes,
        estadoSLA,
        estadoCaso: caso.estadoCaso,
        causalDerivacion: caso.causalDerivacion,
        rutTitular: rutMostrado,
        nombreTitular: nombreMostrado,
        bloqueadoPor: leaseActivo ? caso.operadorBloqueo?.nombre || caso.operadorBloqueoId : null,
      };
    });
  }

  /**
   * Obtiene el detalle completo del expediente de un caso derivado (RQF-009, RQF-020).
   */
  async obtenerDetalleCaso(idCaso: string): Promise<CaseDetailDto> {
    const caso = await this.prisma.caso.findUnique({
      where: { idCaso },
      include: {
        evidencias: true,
        senales: true,
        operadorBloqueo: true,
      },
    });

    if (!caso) {
      throw new NotFoundException(`El caso con identificador ${idCaso} no fue encontrado.`);
    }

    const ahora = new Date();
    if (
      (caso.estadoCaso === EstadoCaso.PENDIENTE_REVISION ||
        caso.estadoCaso === EstadoCaso.EN_REVISION) &&
      caso.fechaVencimientoSLA <= ahora
    ) {
      if (this.prisma.caso.update) {
        await this.prisma.caso.update({
          where: { idCaso },
          data: { estadoCaso: EstadoCaso.VENCIDO_ESCALADO },
        });
      }
      caso.estadoCaso = EstadoCaso.VENCIDO_ESCALADO;
    }

    const horasRestantes = ChileanCalendarUtil.calcularHorasHabilesRestantes(
      ahora,
      caso.fechaVencimientoSLA,
    );
    const estadoSLA = ChileanCalendarUtil.determinarEstadoSLA(horasRestantes);

    const leaseActivo =
      caso.operadorBloqueoId && caso.bloqueoExpiracion && caso.bloqueoExpiracion > ahora;

    const rutMostrado = caso.esAnonimizado
      ? this.piiMaskingService.enmascararRut(caso.rutTitular)
      : caso.rutTitular || null;

    const nombreMostrado = caso.esAnonimizado
      ? this.piiMaskingService.enmascararNombre(caso.nombreTitular)
      : caso.nombreTitular || null;

    return {
      idCaso: caso.idCaso,
      fechaIngreso: caso.fechaIngreso.toISOString(),
      puntajeConfianza: caso.puntajeConfianza,
      estadoCaso: caso.estadoCaso,
      sugerenciaMIRA: caso.sugerenciaMIRA,
      razonDerivacion: caso.razonDerivacion || '',
      causalDerivacion: caso.causalDerivacion,
      fechaVencimientoSLA: caso.fechaVencimientoSLA.toISOString(),
      tiempoRestanteHorasHabiles: horasRestantes,
      estadoSLA,
      rutTitular: rutMostrado,
      nombreTitular: nombreMostrado,
      bloqueadoPor: leaseActivo ? caso.operadorBloqueo?.nombre || caso.operadorBloqueoId : null,
      operadorBloqueoId: leaseActivo ? caso.operadorBloqueoId : null,
      bloqueoExpiracion:
        leaseActivo && caso.bloqueoExpiracion ? caso.bloqueoExpiracion.toISOString() : null,
      evidencias: caso.evidencias.map((e) => ({
        idEvidencia: e.idEvidencia,
        nombreArchivo: e.nombreArchivo,
        tipoArchivo: e.tipoArchivo,
        urlAlmacenamiento: e.urlAlmacenamiento,
        esLegible: e.esLegible,
        motivoIlegibilidad: e.motivoIlegibilidad,
      })),
      senales: caso.senales.map((s) => ({
        idSenal: s.idSenal,
        idEvidencia: s.idEvidencia || null,
        tipoSenal: s.tipoSenal,
        moduloOrigen: s.moduloOrigen,
        puntaje: s.puntaje,
        pesoPonderacion: s.pesoPonderacion,
        umbralMinimo: s.umbralMinimo,
        cumpleMinimo: s.cumpleMinimo,
        esAlertaFraude: s.esAlertaFraude,
        resultado: s.resultado,
        descripcion: s.descripcion,
        ubicacionHallazgo: s.ubicacionHallazgo as any,
      })),
    };
  }
}
