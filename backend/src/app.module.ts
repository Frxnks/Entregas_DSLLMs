import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { StaticFilesModule } from './static-files.module';
import { ReviewTrayModule } from './review-tray/review-tray.module';
import { ScoringModule } from './scoring/scoring.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    StaticFilesModule,
    ReviewTrayModule,
    ScoringModule,
  ],
})
export class AppModule {}
