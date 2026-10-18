import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ScoringController } from './scoring.controller';
import { ScoringEngineService } from './scoring-engine.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ScoringController],
  providers: [ScoringEngineService],
  exports: [ScoringEngineService],
})
export class ScoringModule {}
