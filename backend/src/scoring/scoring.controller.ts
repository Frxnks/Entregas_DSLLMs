import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ScoringEngineService } from './scoring-engine.service';
import { ThresholdService } from './threshold.service';
import {
  EvaluateCaseRequestDto,
  EvaluationResultResponseDto,
} from './dto/evaluate-case.dto';
import { CaseBreakdownResponseDto } from './dto/case-breakdown.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ThresholdResponseDto } from './dto/threshold-response.dto';
import { EstadoDecision } from '@prisma/client';

@Controller('scoring')
export class ScoringController {
  constructor(
    private readonly scoringEngineService: ScoringEngineService,
    @Optional() private readonly thresholdService?: ThresholdService,
  ) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateCase(
    @Body() dto: EvaluateCaseRequestDto,
  ): Promise<EvaluationResultResponseDto> {
    const result = await this.scoringEngineService.evaluarCaso(dto);
    // DEC-01 / RQF-015: Garantizar facturación comercial únicamente ante APROBADO_AUTOMATICO concluyente
    return {
      ...result,
      esFacturable: result.estadoDecision === EstadoDecision.APROBADO_AUTOMATICO,
    };
  }

  @Get('cases/:idCaso/breakdown')
  async getCaseBreakdown(
    @Param('idCaso') idCaso: string,
  ): Promise<CaseBreakdownResponseDto> {
    return this.scoringEngineService.obtenerDesglosePorIdCaso(idCaso);
  }

  @Get('thresholds/:idFlujo')
  async getThresholds(
    @Param('idFlujo') idFlujo: string,
  ): Promise<ThresholdResponseDto> {
    if (!this.thresholdService) {
      throw new Error('ThresholdService no está configurado.');
    }
    return this.thresholdService.obtenerUmbral(idFlujo);
  }

  @Put('thresholds/:idFlujo')
  @HttpCode(HttpStatus.OK)
  async updateThresholds(
    @Param('idFlujo') idFlujo: string,
    @Body() dto: UpdateThresholdDto,
  ): Promise<ThresholdResponseDto> {
    if (!this.thresholdService) {
      throw new Error('ThresholdService no está configurado.');
    }
    return this.thresholdService.actualizarUmbral(idFlujo, dto);
  }

  @Get('thresholds/:idFlujo/audit')
  async getThresholdAudit(
    @Param('idFlujo') idFlujo: string,
  ) {
    if (!this.thresholdService) {
      throw new Error('ThresholdService no está configurado.');
    }
    return this.thresholdService.obtenerAuditoriasPorFlujo(idFlujo);
  }
}
