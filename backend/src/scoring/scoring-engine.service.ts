import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  InputSenalDto,
  EvaluateCaseRequestDto,
  EvaluationResultResponseDto,
} from './dto/evaluate-case.dto';
import {
  CaseBreakdownResponseDto,
  BreakdownSenalDto,
} from './dto/case-breakdown.dto';
import { ChileanCalendarUtil } from '../common/utils/chilean-calendar.util';
import { EstadoDecision, SugerenciaMIRA, CausalDerivacion } from '@prisma/client';

@Injectable()
export class ScoringEngineService {
  private readonly logger = new Logger(ScoringEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el puntaje consolidado ponderado de las señales analizadas normalizado a escala 0-100 (RQF-004).
   * La ausencia de señales devuelve 0 ya que no se asume favorable (Principio §3).
   */
  calcularPuntajePonderado(senales: InputSenalDto[]): number {
    if (!senales || senales.length === 0) {
      return 0;
    }

    const pesoTotal = senales.reduce((acc, s) => acc + s.pesoPonderacion, 0);
    if (pesoTotal <= 0) {
      return 0;
    }

    const sumaPonderada = senales.reduce(
      (acc, s) => acc + s.puntaje * s.pesoPonderacion,
      0,
    );

    const normalizado = sumaPonderada / pesoTotal;
    const acotado = Math.max(0, Math.min(100, normalizado));

    // Redondear a 1 decimal evitando artefactos de precisión IEEE-754
    const saneadoFlotante = Number(acotado.toFixed(4));
    return Math.round(saneadoFlotante * 10) / 10;
  }

  /**
   * Construye el desglose explicativo completo de las señales evaluadas (RQF-004, RQNF-008).
   */
  generarDesglose(
    idCaso: string,
    senales: InputSenalDto[],
    umbralAprobacion: number = 90.0,
  ): CaseBreakdownResponseDto {
    const puntajeConfianza = this.calcularPuntajePonderado(senales);
    const alertaFraudeActiva = senales.some((s) => s.esAlertaFraude);

    const senalesDesglose: BreakdownSenalDto[] = senales.map((s) => {
      const umbralMinimo =
        s.umbralMinimo !== undefined && s.umbralMinimo !== null
          ? s.umbralMinimo
          : 60.0; // Basal de seguridad MVP
      return {
        tipoSenal: s.tipoSenal,
        moduloOrigen: s.moduloOrigen,
        puntaje: s.puntaje,
        pesoPonderacion: s.pesoPonderacion,
        umbralMinimo,
        cumpleMinimo: s.puntaje >= umbralMinimo,
        esAlertaFraude: Boolean(s.esAlertaFraude),
        descripcion: s.descripcion || '',
        ubicacionHallazgo: s.ubicacionHallazgo,
      };
    });

    return {
      idCaso,
      puntajeConfianza,
      umbralAprobacion,
      alertaFraudeActiva,
      senales: senalesDesglose,
    };
  }

  /**
   * Obtiene el desglose estructurado de un caso persistido en base de datos.
   */
  async obtenerDesglosePorIdCaso(idCaso: string): Promise<CaseBreakdownResponseDto> {
    const caso = await this.prisma.caso.findUnique({
      where: { idCaso },
      include: {
        senales: true,
        flujo: {
          include: {
            umbral: true,
          },
        },
      },
    });

    if (!caso) {
      throw new NotFoundException(`Caso ${idCaso} no encontrado.`);
    }

    const umbralAprobacion = caso.flujo?.umbral?.valorAprobacion ?? 90.0;
    const alertaFraudeActiva = caso.senales.some((s) => s.esAlertaFraude);

    const senalesDesglose: BreakdownSenalDto[] = caso.senales.map((s) => ({
      tipoSenal: s.tipoSenal,
      moduloOrigen: s.moduloOrigen,
      puntaje: s.puntaje,
      pesoPonderacion: s.pesoPonderacion,
      umbralMinimo: s.umbralMinimo ?? 60.0,
      cumpleMinimo: s.cumpleMinimo,
      esAlertaFraude: s.esAlertaFraude,
      descripcion: s.descripcion,
      ubicacionHallazgo: (s.ubicacionHallazgo as any) || undefined,
    }));

    return {
      idCaso: caso.idCaso,
      puntajeConfianza: caso.puntajeConfianza,
      umbralAprobacion,
      alertaFraudeActiva,
      senales: senalesDesglose,
    };
  }

  /**
   * Evalúa un caso a partir de sus señales y configuración de umbral del flujo.
   */
  async evaluarCaso(
    dto: EvaluateCaseRequestDto,
  ): Promise<EvaluationResultResponseDto> {
    const flujo = await this.prisma.flujo.findUnique({
      where: { idFlujo: dto.idFlujo },
      include: {
        umbral: true,
      },
    });

    if (!flujo) {
      throw new NotFoundException(
        `Flujo con ID ${dto.idFlujo} no encontrado.`,
      );
    }

    const umbralAprobacion = flujo.umbral?.valorAprobacion ?? 90.0;
    const puntajeConfianza = this.calcularPuntajePonderado(dto.senales);
    const ahora = new Date();
    const fechaVencimientoSLA = ChileanCalendarUtil.agregarDiasHabiles(
      ahora,
      3,
    ).toISOString();

    let estadoDecision: EstadoDecision;
    let sugerenciaMIRA: SugerenciaMIRA;
    let causalDerivacion: CausalDerivacion;
    let razonDerivacion: string;
    let esFacturable: boolean;

    if (puntajeConfianza >= umbralAprobacion) {
      estadoDecision = EstadoDecision.APROBADO_AUTOMATICO;
      sugerenciaMIRA = SugerenciaMIRA.APROBAR;
      causalDerivacion = CausalDerivacion.NINGUNA;
      razonDerivacion = `Puntaje de confianza sobresaliente (${puntajeConfianza}/100) que supera o iguala el umbral de aprobación de ${umbralAprobacion} puntos.`;
      esFacturable = true; // DEC-01
    } else {
      estadoDecision = EstadoDecision.DERIVADO_REVISION_ASISTIDA;
      sugerenciaMIRA = SugerenciaMIRA.APROBAR;
      causalDerivacion = CausalDerivacion.PUNTAJE_INSUFICIENTE;
      razonDerivacion = `Puntaje global insuficiente (${puntajeConfianza}/100) inferior al umbral de aprobación automática (${umbralAprobacion} puntos). Prohibición de rechazo automático conforme a DEC-04.`;
      esFacturable = false;
    }

    return {
      idCaso: dto.idCaso,
      puntajeConfianza,
      estadoDecision,
      sugerenciaMIRA,
      causalDerivacion,
      razonDerivacion,
      esFacturable,
      fechaVencimientoSLA,
    };
  }
}
