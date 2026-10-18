import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewTrayService } from './review-tray.service';
import { ConcurrencyService } from './concurrency.service';
import { ResolutionService } from './resolution.service';
import { CaseSummaryDto } from './dto/case-summary.dto';
import { CaseDetailDto } from './dto/case-detail.dto';
import { AcquireLeaseRequestDto, LeaseResponseDto } from './dto/lease.dto';
import {
  SubmitDecisionRequestDto,
  DecisionResultDto,
  DiscrepancyItemDto,
} from './dto/decision.dto';
import { EstadoCaso, NivelPrioridad } from '@prisma/client';

@Controller('review-tray')
export class ReviewTrayController {
  constructor(
    private readonly reviewTrayService: ReviewTrayService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly resolutionService: ResolutionService,
  ) {}

  @Get('cases')
  async getReviewCases(
    @Query('estado') estado?: EstadoCaso,
    @Query('prioridad') prioridad?: NivelPrioridad,
  ): Promise<CaseSummaryDto[]> {
    return this.reviewTrayService.listarCasos(estado, prioridad);
  }

  @Get('cases/:idCaso')
  async getCaseDetail(@Param('idCaso') idCaso: string): Promise<CaseDetailDto> {
    return this.reviewTrayService.obtenerDetalleCaso(idCaso);
  }

  @Post('cases/:idCaso/lease')
  @HttpCode(HttpStatus.OK)
  async acquireOrRenewLease(
    @Param('idCaso') idCaso: string,
    @Body() dto: AcquireLeaseRequestDto,
  ): Promise<LeaseResponseDto> {
    return this.concurrencyService.adquirirOExtenderLease(idCaso, dto.idOperador);
  }

  @Post('cases/:idCaso/decision')
  @HttpCode(HttpStatus.CREATED)
  async submitDecision(
    @Param('idCaso') idCaso: string,
    @Body() dto: SubmitDecisionRequestDto,
    @Req() req: Request,
  ): Promise<DecisionResultDto> {
    const ip = req.ip || req.socket.remoteAddress;
    return this.resolutionService.registrarDecision(idCaso, dto, ip);
  }

  @Get('discrepancies')
  async getDiscrepancies(): Promise<DiscrepancyItemDto[]> {
    return this.resolutionService.obtenerDiscrepancias();
  }
}
