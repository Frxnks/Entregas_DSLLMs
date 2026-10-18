export interface AuditoriaUmbralDto {
  idAuditoria: string;
  idFlujo: string;
  valorAprobacionAnterior: number;
  valorAprobacionNuevo: number;
  minimoBasalAnterior: number;
  minimoBasalNuevo: number;
  usuarioModificador: string;
  fechaModificacion: string;
}

export class ThresholdResponseDto {
  idUmbral?: string;
  idFlujo: string;
  valorAprobacion: number;
  minimoBasalSeguridad: number;
  version: number;
  fechaActualizacion: string | Date;
  auditorias?: AuditoriaUmbralDto[];
}
