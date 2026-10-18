import { IsNotEmpty, IsUUID } from 'class-validator';

export class AcquireLeaseRequestDto {
  @IsNotEmpty({ message: 'El identificador del operador es obligatorio' })
  @IsUUID('all', { message: 'El idOperador debe ser un UUID válido' })
  idOperador: string;
}

export class LeaseResponseDto {
  idCaso: string;
  operadorBloqueoId: string;
  bloqueoExpiracion: string;
  vigenciaMinutos: number;
}
