import { Injectable, Logger } from '@nestjs/common';
import {
  EstadoDecision,
  SugerenciaMIRA,
  CausalDerivacion,
  NivelPrioridad,
} from '@prisma/client';
import { InputSenalDto } from './dto/evaluate-case.dto';

export interface EvaluacionReglasResultado {
  estadoDecision: EstadoDecision;
  sugerenciaMIRA: SugerenciaMIRA;
  causalDerivacion: CausalDerivacion;
  nivelPrioridad: NivelPrioridad;
  razonDerivacion: string;
  esFacturable: boolean;
  esAlertaFraude: boolean;
  senalesFraude?: InputSenalDto[];
  senalesBajoMinimo?: InputSenalDto[];
}

export interface EvaluarReglasParams {
  puntajeConfianza: number;
  senales: InputSenalDto[];
  umbralAprobacion?: number;
  minimoBasalSeguridad?: number;
}

@Injectable()
export class DecisionRulesService {
  private readonly logger = new Logger(DecisionRulesService.name);

  /**
   * Determina si al menos una de las señales analizadas presenta una alerta de fraude activa (RQF-023).
   */
  tieneAlertaFraude(senales: InputSenalDto[]): boolean {
    if (!senales || senales.length === 0) {
      return false;
    }
    return senales.some((s) => Boolean(s.esAlertaFraude));
  }

  /**
   * Obtiene la lista de señales que presentan alerta de fraude activa.
   */
  obtenerSenalesFraude(senales: InputSenalDto[]): InputSenalDto[] {
    if (!senales || senales.length === 0) {
      return [];
    }
    return senales.filter((s) => Boolean(s.esAlertaFraude));
  }

  /**
   * Identifica las señales que no alcanzan el umbral mínimo configurado o el mínimo basal de seguridad (RQF-022).
   */
  obtenerSenalesBajoMinimo(
    senales: InputSenalDto[],
    minimoBasal: number = 60.0,
  ): InputSenalDto[] {
    if (!senales || senales.length === 0) {
      return [];
    }
    return senales.filter((s) => {
      const umbralMin =
        s.umbralMinimo !== undefined && s.umbralMinimo !== null
          ? s.umbralMinimo
          : minimoBasal;
      return s.puntaje < umbralMin;
    });
  }

  /**
   * Evalúa la regla de precedencia absoluta de señales de fraude (DEC-04 / RQF-023).
   * Si existe al menos una señal de fraude, intercepta de forma concluyente cualquier aprobación
   * forzando veredicto DERIVADO_REVISION_ASISTIDA, causal FRAUDE, sugerencia RECHAZAR y prioridad ALTA.
   */
  evaluarPrecedenciaFraude(
    senales: InputSenalDto[],
  ): {
    esAlertaFraude: boolean;
    estadoDecision: EstadoDecision;
    causalDerivacion: CausalDerivacion;
    nivelPrioridad: NivelPrioridad;
    sugerenciaMIRA: SugerenciaMIRA;
    esFacturable: boolean;
    razonDerivacion: string;
    senalesFraude: InputSenalDto[];
  } | null {
    const senalesFraude = this.obtenerSenalesFraude(senales);
    if (senalesFraude.length === 0) {
      return null;
    }

    const descripciones = senalesFraude
      .map((s) => s.descripcion)
      .filter(Boolean)
      .join('; ');

    const razonDerivacion = descripciones
      ? `Alerta de fraude activa: ${descripciones}. Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023).`
      : 'Alerta de fraude activa en una o más señales evaluadas. Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023).';

    return {
      esAlertaFraude: true,
      estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
      causalDerivacion: CausalDerivacion.FRAUDE,
      nivelPrioridad: NivelPrioridad.ALTA,
      sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
      esFacturable: false, // DEC-01: Derivados a revisión asistida no son facturables
      razonDerivacion,
      senalesFraude,
    };
  }

  /**
   * Evalúa si una o más señales individuales reprueban su umbral mínimo configurado
   * o el mínimo basal de seguridad (60 puntos en señales documentales del MVP, RQF-022).
   * Si alguna reprueba, retorna la evaluación con causal MINIMO_SENAL y prioridad MEDIA.
   * Si todas cumplen, retorna null.
   */
  evaluarMinimosSenal(
    senales: InputSenalDto[],
    minimoBasal: number = 60.0,
    puntajeConfianza?: number,
    umbralAprobacion: number = 90.0,
  ): {
    estadoDecision: EstadoDecision;
    sugerenciaMIRA: SugerenciaMIRA;
    causalDerivacion: CausalDerivacion;
    nivelPrioridad: NivelPrioridad;
    razonDerivacion: string;
    esFacturable: boolean;
    senalesBajoMinimo: InputSenalDto[];
  } | null {
    const senalesBajoMinimo = this.obtenerSenalesBajoMinimo(
      senales,
      minimoBasal,
    );
    if (senalesBajoMinimo.length === 0) {
      return null;
    }

    const detalle = senalesBajoMinimo
      .map((s) => {
        const min =
          s.umbralMinimo !== undefined && s.umbralMinimo !== null
            ? s.umbralMinimo
            : minimoBasal;
        return `${s.tipoSenal} (${s.puntaje} < mín. ${min})`;
      })
      .join(', ');

    const razonDerivacion =
      puntajeConfianza !== undefined && puntajeConfianza >= umbralAprobacion
        ? `Puntaje global suficiente (${puntajeConfianza}/100) pero una o más señales individuales reprueban su umbral mínimo configurado: ${detalle}. Derivado a revisión asistida conforme a RQF-022.`
        : `Incumplimiento de umbral mínimo en una o más señales individuales: ${detalle}. Derivado obligatoriamente a revisión asistida conforme a RQF-022.`;

    return {
      estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
      sugerenciaMIRA: SugerenciaMIRA.APROBAR,
      causalDerivacion: CausalDerivacion.MINIMO_SENAL,
      nivelPrioridad: NivelPrioridad.MEDIA,
      esFacturable: false, // DEC-01
      razonDerivacion,
      senalesBajoMinimo,
    };
  }

  /**
   * Evalúa el puntaje global de confianza contra el umbral de aprobación configurado (90 puntos por defecto, DEC-11).
   * Si puntaje >= umbral: APROBADO_AUTOMATICO, facturable, prioridad BAJA.
   * Si puntaje < umbral: DERIVADO_REVISION_ASISTIDA, PUNTAJE_INSUFICIENTE, no facturable, prioridad MEDIA (DEC-04).
   */
  evaluarUmbralPuntaje(
    puntajeConfianza: number,
    umbralAprobacion: number = 90.0,
  ): {
    estadoDecision: EstadoDecision;
    sugerenciaMIRA: SugerenciaMIRA;
    causalDerivacion: CausalDerivacion;
    nivelPrioridad: NivelPrioridad;
    razonDerivacion: string;
    esFacturable: boolean;
  } {
    if (puntajeConfianza >= umbralAprobacion) {
      return {
        estadoDecision: EstadoDecision.APROBADO_AUTOMATICO,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        causalDerivacion: CausalDerivacion.NINGUNA,
        nivelPrioridad: NivelPrioridad.BAJA,
        esFacturable: true, // DEC-01
        razonDerivacion: `Puntaje de confianza sobresaliente (${puntajeConfianza}/100) que supera o iguala el umbral de aprobación de ${umbralAprobacion} puntos sin discrepancias ni señales adversas.`,
      };
    } else {
      return {
        estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
        sugerenciaMIRA: SugerenciaMIRA.APROBAR,
        causalDerivacion: CausalDerivacion.PUNTAJE_INSUFICIENTE,
        nivelPrioridad: NivelPrioridad.MEDIA,
        esFacturable: false, // DEC-01
        razonDerivacion: `Puntaje global insuficiente (${puntajeConfianza}/100) inferior al umbral de aprobación automática configurado (${umbralAprobacion} puntos). Prohibición de rechazo automático conforme a DEC-04.`,
      };
    }
  }

  /**
   * Evalúa el árbol de decisiones completo bajo jerarquía estricta de precedencia resolutiva:
   * 1º Precedencia absoluta de señales de fraude (RQF-023, DEC-04).
   * 2º Mínimos basales individuales por señal (RQF-022).
   * 3º Umbral global de aprobación automática (DEC-11, DEC-01).
   */
  evaluarReglas(params: EvaluarReglasParams): EvaluacionReglasResultado {
    const { puntajeConfianza, senales } = params;
    const umbralAprobacion = params.umbralAprobacion ?? 90.0;
    const minimoBasalSeguridad = params.minimoBasalSeguridad ?? 60.0;

    // 1º NIVEL: Precedencia absoluta de señales de fraude (DEC-04 / RQF-023)
    const interceptFraude = this.evaluarPrecedenciaFraude(senales);
    if (interceptFraude) {
      this.logger.warn(
        `Caso interceptado por alerta de fraude: ${interceptFraude.senalesFraude.length} señal(es) adversa(s). Veredicto forzado a DERIVADO_REVISION_ASISTIDA con prioridad ALTA.`,
      );
      return {
        estadoDecision: interceptFraude.estadoDecision,
        sugerenciaMIRA: interceptFraude.sugerenciaMIRA,
        causalDerivacion: interceptFraude.causalDerivacion,
        nivelPrioridad: interceptFraude.nivelPrioridad,
        razonDerivacion: interceptFraude.razonDerivacion,
        esFacturable: interceptFraude.esFacturable,
        esAlertaFraude: true,
        senalesFraude: interceptFraude.senalesFraude,
      };
    }

    // 2º NIVEL: Mínimos individuales por señal (RQF-022)
    const interceptMinimo = this.evaluarMinimosSenal(
      senales,
      minimoBasalSeguridad,
      puntajeConfianza,
      umbralAprobacion,
    );
    if (interceptMinimo) {
      return {
        estadoDecision: interceptMinimo.estadoDecision,
        sugerenciaMIRA: interceptMinimo.sugerenciaMIRA,
        causalDerivacion: interceptMinimo.causalDerivacion,
        nivelPrioridad: interceptMinimo.nivelPrioridad,
        razonDerivacion: interceptMinimo.razonDerivacion,
        esFacturable: interceptMinimo.esFacturable,
        esAlertaFraude: false,
        senalesBajoMinimo: interceptMinimo.senalesBajoMinimo,
      };
    }

    // 3º NIVEL: Umbral global de aprobación automática (DEC-11, DEC-01)
    const decisionPuntaje = this.evaluarUmbralPuntaje(
      puntajeConfianza,
      umbralAprobacion,
    );
    return {
      estadoDecision: decisionPuntaje.estadoDecision,
      sugerenciaMIRA: decisionPuntaje.sugerenciaMIRA,
      causalDerivacion: decisionPuntaje.causalDerivacion,
      nivelPrioridad: decisionPuntaje.nivelPrioridad,
      razonDerivacion: decisionPuntaje.razonDerivacion,
      esFacturable: decisionPuntaje.esFacturable,
      esAlertaFraude: false,
    };
  }
}
