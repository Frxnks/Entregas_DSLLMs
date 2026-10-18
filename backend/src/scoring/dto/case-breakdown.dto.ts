import { BoundingBoxDto } from './evaluate-case.dto';

export class BreakdownSenalDto {
  tipoSenal: string;
  moduloOrigen: string;
  puntaje: number;
  pesoPonderacion: number;
  umbralMinimo: number;
  cumpleMinimo: boolean;
  esAlertaFraude: boolean;
  descripcion: string;
  ubicacionHallazgo?: BoundingBoxDto;
}

export class CaseBreakdownResponseDto {
  idCaso: string;
  puntajeConfianza: number;
  umbralAprobacion: number;
  alertaFraudeActiva: boolean;
  senales: BreakdownSenalDto[];
}
