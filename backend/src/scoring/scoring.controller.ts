import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScoringEngineService } from './scoring-engine.service';
import {
  EvaluateCaseRequestDto,
  EvaluationResultResponseDto,
} from './dto/evaluate-case.dto';
import { CaseBreakdownResponseDto } from './dto/case-breakdown.dto';
import { EstadoDecision } from '@prisma/client';

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringEngineService: ScoringEngineService) {}

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
}
