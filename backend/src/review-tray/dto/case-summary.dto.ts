import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CaseSummaryDto {
  @IsString()
  idCaso: string;

  @IsString()
  fechaIngreso: string;

  @IsNumber()
  puntajeConfianza: number;

  @IsString()
  razonDerivacion: string;

  @IsString()
  sugerenciaMIRA: 'APROBAR' | 'RECHAZAR' | 'SOLICITAR_ANTECEDENTES';

  @IsString()
  nivelPrioridad: 'ALTA' | 'MEDIA' | 'BAJA';

  @IsBoolean()
  alertaFraude: boolean;

  @IsNumber()
  tiempoRestanteHorasHabiles: number;

  @IsString()
  estadoSLA: 'EN_PLAZO' | 'PROXIMO_A_VENCER' | 'VENCIDO_ESCALADO';

  @IsOptional()
  @IsString()
  bloqueadoPor?: string | null;

  @IsOptional()
  @IsString()
  estadoCaso?: string;

  @IsOptional()
  @IsString()
  causalDerivacion?: string;

  @IsOptional()
  @IsString()
  rutTitular?: string | null;

  @IsOptional()
  @IsString()
  nombreTitular?: string | null;
}
