import { IsNumber, IsString, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class UpdateThresholdDto {
  @IsNumber({}, { message: 'El valor de aprobación debe ser un número decimal entre 0 y 100.' })
  @Min(0, { message: 'El umbral de aprobación no puede ser inferior a 0.' })
  @Max(100, { message: 'El umbral de aprobación no puede ser superior a 100.' })
  valorAprobacion: number;

  @IsOptional()
  @IsNumber({}, { message: 'El mínimo basal de seguridad debe ser un número decimal entre 0 y 100.' })
  @Min(0, { message: 'El mínimo basal de seguridad no puede ser inferior a 0.' })
  @Max(100, { message: 'El mínimo basal de seguridad no puede ser superior a 100.' })
  minimoBasalSeguridad?: number;

  @IsString({ message: 'El usuario modificador debe ser una cadena de texto válida.' })
  @IsNotEmpty({ message: 'El identificador del usuario modificador es obligatorio para auditoría.' })
  usuarioModificador: string;
}
