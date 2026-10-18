import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubmitDecisionRequestDto,
  DecisionResultDto,
  DiscrepancyItemDto,
  TipoDecisionEnum,
} from './dto/decision.dto';
import { EstadoCaso, TipoDecisionOperador, SugerenciaMIRA } from '@prisma/client';

@Injectable()
export class ResolutionService {
  private readonly logger = new Logger(ResolutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra el veredicto formal del operador de manera atómica, append-only e inalterable (RQF-010, RQNF-005).
   * Detecta automáticamente si existe discrepancia con la sugerencia de MIRA (CU-02, RQF-011).
   */
  async registrarDecision(
    idCaso: string,
    dto: SubmitDecisionRequestDto,
    ipOperador?: string,
  ): Promise<DecisionResultDto> {
    if (!dto.idOperador) {
      throw new BadRequestException('El idOperador es obligatorio.');
    }

    if (!dto.tipoDecision) {
      throw new BadRequestException('El tipo de decisión es obligatorio.');
    }

    if (!dto.justificacion || dto.justificacion.trim().length < 10) {
      throw new BadRequestException(
        'La justificación explicativa es obligatoria y debe contener al menos 10 caracteres.',
      );
    }

    const caso = await this.prisma.caso.findUnique({
      where: { idCaso },
      include: { decision: true },
    });

    if (!caso) {
      throw new NotFoundException(`El caso con ID ${idCaso} no fue encontrado.`);
    }

    if (caso.estadoCaso === EstadoCaso.RESUELTO || caso.decision) {
      throw new ConflictException(
        'El caso ya cuenta con una resolución registrada y no admite modificaciones (principio append-only inalterable).',
      );
    }

    const operador = await this.prisma.operador.findUnique({
      where: { idOperador: dto.idOperador },
    });

    if (!operador) {
      throw new NotFoundException(`El operador con ID ${dto.idOperador} no existe en el sistema.`);
    }

    // Detectar si la decisión humana difiere de la sugerencia analítica de MIRA (CU-02, RQF-011)
    const marcaDiscrepancia = this.evaluarDiscrepancia(caso.sugerenciaMIRA, dto.tipoDecision);

    // Mapear enum de DTO a enum de Prisma
    const tipoDecisionPrisma = dto.tipoDecision as unknown as TipoDecisionOperador;

    // Ejecutar transacción atómica: Registrar decisión append-only y actualizar estado del caso a RESUELTO
    const [nuevaDecision] = await this.prisma.$transaction([
      this.prisma.decision.create({
        data: {
          idCaso: caso.idCaso,
          idOperador: operador.idOperador,
          tipoDecision: tipoDecisionPrisma,
          justificacion: dto.justificacion.trim(),
          marcaDiscrepancia,
          esInalterable: true,
          ipOperador: ipOperador || null,
        },
      }),
      this.prisma.caso.update({
        where: { idCaso },
        data: {
          estadoCaso: EstadoCaso.RESUELTO,
          operadorBloqueoId: null,
          bloqueoExpiracion: null,
        },
      }),
    ]);

    this.logger.log(
      `Decisión inalterable registrada para caso ${idCaso} por ${operador.email}: ${dto.tipoDecision} (Discrepancia: ${marcaDiscrepancia})`,
    );

    return {
      idDecision: nuevaDecision.idDecision,
      idCaso: nuevaDecision.idCaso,
      estadoCasoFinal: EstadoCaso.RESUELTO,
      tipoDecision: nuevaDecision.tipoDecision,
      marcaDiscrepancia: nuevaDecision.marcaDiscrepancia,
      fechaDecision: nuevaDecision.fechaDecision.toISOString(),
      mensaje: 'Decisión registrada exitosamente de forma inalterable.',
    };
  }

  /**
   * Evalúa si existe discrepancia entre la recomendación del motor MIRA y la decisión humana del liquidador.
   */
  private evaluarDiscrepancia(
    sugerenciaMIRA: SugerenciaMIRA,
    tipoDecision: TipoDecisionEnum | string,
  ): boolean {
    const decisionStr = String(tipoDecision).trim().toUpperCase();
    if (sugerenciaMIRA === SugerenciaMIRA.APROBAR && decisionStr !== TipoDecisionEnum.APROBADO) {
      return true;
    }
    if (sugerenciaMIRA === SugerenciaMIRA.RECHAZAR && decisionStr !== TipoDecisionEnum.RECHAZADO) {
      return true;
    }
    if (
      sugerenciaMIRA === SugerenciaMIRA.SOLICITAR_ANTECEDENTES &&
      decisionStr !== TipoDecisionEnum.SOLICITAR_ANTECEDENTES
    ) {
      return true;
    }
    return false;
  }

  /**
   * Consulta el histórico de casos resueltos con discrepancia algorítmica para auditoría y mejora de modelos (RQF-011).
   */
  async obtenerDiscrepancias(): Promise<DiscrepancyItemDto[]> {
    const decisionesDiscrepantes = await this.prisma.decision.findMany({
      where: { marcaDiscrepancia: true },
      include: {
        caso: true,
        operador: true,
      },
      orderBy: { fechaDecision: 'desc' },
    });

    return decisionesDiscrepantes.map((d) => ({
      idCaso: d.idCaso,
      sugerenciaMIRA: d.caso.sugerenciaMIRA,
      decisionOperador: d.tipoDecision,
      justificacion: d.justificacion,
      operadorNombre: d.operador?.nombre || 'Operador',
      fechaDecision: d.fechaDecision.toISOString(),
    }));
  }
}
