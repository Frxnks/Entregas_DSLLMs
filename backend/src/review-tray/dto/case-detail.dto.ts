export class BoundingBoxDto {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class EvidenciaDetailDto {
  idEvidencia: string;
  nombreArchivo: string;
  tipoArchivo: string;
  urlAlmacenamiento: string;
  esLegible: boolean;
  motivoIlegibilidad?: string | null;
}

export class SenalDetailDto {
  idSenal: string;
  idEvidencia?: string | null;
  tipoSenal: string;
  moduloOrigen: string;
  puntaje: number;
  pesoPonderacion: number;
  umbralMinimo?: number | null;
  cumpleMinimo: boolean;
  esAlertaFraude: boolean;
  resultado: string;
  descripcion: string;
  ubicacionHallazgo?: BoundingBoxDto | null;
}

export class CaseDetailDto {
  idCaso: string;
  fechaIngreso: string;
  puntajeConfianza: number;
  estadoCaso: string;
  sugerenciaMIRA: string;
  razonDerivacion: string;
  causalDerivacion: string;
  fechaVencimientoSLA: string;
  tiempoRestanteHorasHabiles: number;
  estadoSLA: string;
  rutTitular?: string | null;
  nombreTitular?: string | null;
  bloqueadoPor?: string | null;
  operadorBloqueoId?: string | null;
  bloqueoExpiracion?: string | null;
  evidencias: EvidenciaDetailDto[];
  senales: SenalDetailDto[];
}
