/**
 * MIRA - Tipos TypeScript coincidentes con los contratos OpenAPI
 * (ReviewTray API y Scoring API)
 */

export interface BoundingBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EstadoCaso =
  | 'INGRESADO'
  | 'EVALUADO'
  | 'PENDIENTE_REVISION'
  | 'EN_REVISION'
  | 'RESUELTO'
  | 'VENCIDO_ESCALADO';

export type EstadoDecision =
  | 'APROBADO_AUTOMATICO'
  | 'DERIVADO_REVISION_ASISTIDA';

export type SugerenciaMIRA =
  | 'APROBAR'
  | 'RECHAZAR'
  | 'SOLICITAR_ANTECEDENTES';

export type CausalDerivacion =
  | 'FRAUDE'
  | 'MINIMO_SENAL'
  | 'PUNTAJE_INSUFICIENTE'
  | 'NINGUNA';

export type NivelPrioridad =
  | 'ALTA'
  | 'MEDIA'
  | 'BAJA';

export type EstadoSLA =
  | 'EN_PLAZO'
  | 'PROXIMO_A_VENCER'
  | 'VENCIDO_ESCALADO';

export type TipoDecisionOperador =
  | 'APROBADO'
  | 'RECHAZADO'
  | 'SOLICITAR_ANTECEDENTES';

export interface EvidenciaDto {
  idEvidencia: string;
  nombreArchivo: string;
  tipoArchivo: string;
  urlAlmacenamiento: string;
  esLegible: boolean;
  motivoIlegibilidad?: string;
}

export interface SenalDto {
  idSenal: string;
  tipoSenal: string;
  moduloOrigen: string;
  puntaje: number;
  pesoPonderacion?: number;
  umbralMinimo?: number;
  cumpleMinimo?: boolean;
  esAlertaFraude: boolean;
  descripcion: string;
  idEvidencia?: string;
  ubicacionHallazgo?: BoundingBox;
}

export interface CaseSummaryDto {
  idCaso: string;
  fechaIngreso: string;
  puntajeConfianza: number;
  razonDerivacion: string;
  sugerenciaMIRA: SugerenciaMIRA;
  nivelPrioridad: NivelPrioridad;
  alertaFraude: boolean;
  tiempoRestanteHorasHabiles: number;
  estadoSLA: EstadoSLA;
  bloqueadoPor?: string | null;
}

export interface CaseDetailDto {
  idCaso: string;
  fechaIngreso: string;
  puntajeConfianza: number;
  estadoCaso: EstadoCaso;
  sugerenciaMIRA: SugerenciaMIRA;
  razonDerivacion: string;
  causalDerivacion: CausalDerivacion;
  fechaVencimientoSLA: string;
  tiempoRestanteHorasHabiles: number;
  estadoSLA: EstadoSLA;
  evidencias: EvidenciaDto[];
  senales: SenalDto[];
  rutTitular?: string;
  nombreTitular?: string;
  bloqueadoPor?: string | null;
  operadorBloqueoId?: string | null;
  bloqueoExpiracion?: string | null;
}

export interface AcquireLeaseRequestDto {
  idOperador: string;
}

export interface LeaseResponseDto {
  idCaso: string;
  operadorBloqueoId: string;
  bloqueoExpiracion: string;
  vigenciaMinutos: number;
}

export interface SubmitDecisionRequestDto {
  idOperador: string;
  tipoDecision: TipoDecisionOperador;
  justificacion: string;
}

export interface DecisionResultDto {
  idDecision: string;
  idCaso: string;
  estadoCasoFinal: string;
  tipoDecision: string;
  marcaDiscrepancia: boolean;
  fechaDecision: string;
  mensaje: string;
}

export interface DiscrepancyItemDto {
  idCaso: string;
  sugerenciaMIRA: string;
  decisionOperador: string;
  justificacion: string;
  operadorNombre?: string;
  fechaDecision: string;
}

// ==========================================
// Tipos para Scoring & Thresholds (F4)
// ==========================================

export interface InputSenalDto {
  tipoSenal: string;
  moduloOrigen: string;
  puntaje: number;
  pesoPonderacion: number;
  umbralMinimo?: number;
  esAlertaFraude: boolean;
  idEvidencia?: string;
  descripcion?: string;
  ubicacionHallazgo?: BoundingBox;
}

export interface EvaluateCaseRequestDto {
  idCaso: string;
  idFlujo: string;
  senales: InputSenalDto[];
}

export interface EvaluationResultResponseDto {
  idCaso: string;
  puntajeConfianza: number;
  estadoDecision: EstadoDecision;
  sugerenciaMIRA: SugerenciaMIRA;
  causalDerivacion: CausalDerivacion;
  razonDerivacion: string;
  esFacturable: boolean;
  fechaVencimientoSLA: string;
}

export interface CaseBreakdownResponseDto {
  idCaso: string;
  puntajeConfianza: number;
  umbralAprobacion: number;
  alertaFraudeActiva: boolean;
  senales: SenalDto[];
}

export interface ThresholdResponseDto {
  idFlujo: string;
  valorAprobacion: number;
  minimoBasalSeguridad: number;
  version: number;
  fechaActualizacion: string;
}

export interface UpdateThresholdDto {
  valorAprobacion: number;
  minimoBasalSeguridad?: number;
  usuarioModificador: string;
}
