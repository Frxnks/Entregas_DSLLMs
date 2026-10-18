import { IsEnum, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export enum TipoDecisionEnum {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  SOLICITAR_ANTECEDENTES = 'SOLICITAR_ANTECEDENTES',
}

export class SubmitDecisionRequestDto {
  @IsNotEmpty({ message: 'El idOperador es obligatorio.' })
  @IsUUID('all', { message: 'El idOperador debe ser un UUID válido.' })
  idOperador: string;

  @IsNotEmpty({ message: 'El tipo de decisión es obligatorio.' })
  @IsEnum(TipoDecisionEnum, {
    message: 'El tipo de decisión debe ser APROBADO, RECHAZADO o SOLICITAR_ANTECEDENTES.',
  })
  tipoDecision: TipoDecisionEnum;

  @IsNotEmpty({ message: 'La justificación es obligatoria.' })
  @IsString({ message: 'La justificación debe ser una cadena de texto.' })
  @MinLength(10, { message: 'La justificación debe contener al menos 10 caracteres explicativos.' })
  justificacion: string;
}

export class DecisionResultDto {
  idDecision: string;
  idCaso: string;
  estadoCasoFinal: string;
  tipoDecision: string;
  marcaDiscrepancia: boolean;
  fechaDecision: string;
  mensaje: string;
}

export class DiscrepancyItemDto {
  idCaso: string;
  sugerenciaMIRA: string;
  decisionOperador: string;
  justificacion: string;
  operadorNombre: string;
  fechaDecision: string;
}
