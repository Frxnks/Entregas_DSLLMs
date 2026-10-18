import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ScoringController } from './scoring.controller';
import { ScoringEngineService } from './scoring-engine.service';
import { DecisionRulesService } from './decision-rules.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ScoringController],
  providers: [ScoringEngineService, DecisionRulesService],
  exports: [ScoringEngineService, DecisionRulesService],
})
export class ScoringModule {}

