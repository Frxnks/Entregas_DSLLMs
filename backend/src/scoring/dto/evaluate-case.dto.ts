import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoDecision, SugerenciaMIRA, CausalDerivacion } from '@prisma/client';

export class BoundingBoxDto {
  @IsOptional()
  @IsNumber({}, { message: 'El número de página debe ser un número.' })
  page?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La coordenada x debe ser un número.' })
  x?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La coordenada y debe ser un número.' })
  y?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El ancho width debe ser un número.' })
  width?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La altura height debe ser un número.' })
  height?: number;
}

export class InputSenalDto {
  @IsNotEmpty({ message: 'El tipoSenal es obligatorio.' })
  @IsString({ message: 'El tipoSenal debe ser una cadena de texto.' })
  tipoSenal: string;

  @IsNotEmpty({ message: 'El moduloOrigen es obligatorio.' })
  @IsString({ message: 'El moduloOrigen debe ser una cadena de texto.' })
  moduloOrigen: string;

  @IsNotEmpty({ message: 'El puntaje es obligatorio.' })
  @IsNumber({}, { message: 'El puntaje debe ser un número.' })
  @Min(0, { message: 'El puntaje mínimo es 0.' })
  @Max(100, { message: 'El puntaje máximo es 100.' })
  puntaje: number;

  @IsNotEmpty({ message: 'El pesoPonderacion es obligatorio.' })
  @IsNumber({}, { message: 'El pesoPonderacion debe ser un número.' })
  @Min(0, { message: 'El pesoPonderacion mínimo es 0.' })
  @Max(1, { message: 'El pesoPonderacion máximo es 1.' })
  pesoPonderacion: number;

  @IsOptional()
  @IsNumber({}, { message: 'El umbralMinimo debe ser un número.' })
  umbralMinimo?: number;

  @IsNotEmpty({ message: 'El flag esAlertaFraude es obligatorio.' })
  @IsBoolean({ message: 'El flag esAlertaFraude debe ser un booleano.' })
  esAlertaFraude: boolean;

  @IsOptional()
  @IsString({ message: 'El idEvidencia debe ser una cadena de texto.' })
  idEvidencia?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  descripcion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BoundingBoxDto)
  ubicacionHallazgo?: BoundingBoxDto;
}

export class EvaluateCaseRequestDto {
  @IsNotEmpty({ message: 'El idCaso es obligatorio.' })
  @IsString({ message: 'El idCaso debe ser una cadena de texto.' })
  idCaso: string;

  @IsNotEmpty({ message: 'El idFlujo es obligatorio.' })
  @IsString({ message: 'El idFlujo debe ser una cadena de texto o UUID.' })
  idFlujo: string;

  @IsArray({ message: 'Las senales deben ser un arreglo.' })
  @ValidateNested({ each: true })
  @Type(() => InputSenalDto)
  senales: InputSenalDto[];
}

export class EvaluationResultResponseDto {
  idCaso: string;
  puntajeConfianza: number;
  estadoDecision: EstadoDecision | string;
  sugerenciaMIRA: SugerenciaMIRA | string;
  causalDerivacion: CausalDerivacion | string;
  razonDerivacion: string;
  esFacturable: boolean;
  fechaVencimientoSLA: string;
}
