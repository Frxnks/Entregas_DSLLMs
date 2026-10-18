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

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringEngineService: ScoringEngineService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateCase(
    @Body() dto: EvaluateCaseRequestDto,
  ): Promise<EvaluationResultResponseDto> {
    return this.scoringEngineService.evaluarCaso(dto);
  }

  @Get('cases/:idCaso/breakdown')
  async getCaseBreakdown(
    @Param('idCaso') idCaso: string,
  ): Promise<CaseBreakdownResponseDto> {
    return this.scoringEngineService.obtenerDesglosePorIdCaso(idCaso);
  }
}
