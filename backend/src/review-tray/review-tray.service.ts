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
   * Obtiene la lista de casos derivados para la bandeja de revisión asistida (RQF-008, RQF-021, RQF-024).
   */
  async listarCasos(estado?: EstadoCaso, prioridad?: NivelPrioridad): Promise<CaseSummaryDto[]> {
    const ahora = new Date();

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

    return casos.map((caso) => {
      const horasRestantes = ChileanCalendarUtil.calcularHorasHabilesRestantes(
        ahora,
        caso.fechaVencimientoSLA,
      );
      const estadoSLA = ChileanCalendarUtil.determinarEstadoSLA(horasRestantes);
      const tieneFraude =
        caso.senales.some((s) => s.esAlertaFraude) || caso.causalDerivacion === 'FRAUDE';

      const leaseActivo =
        caso.operadorBloqueoId && caso.bloqueoExpiracion && caso.bloqueoExpiracion > ahora;

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
