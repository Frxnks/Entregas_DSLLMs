import { Module } from '@nestjs/common';
import { ReviewTrayController } from './review-tray.controller';
import { ReviewTrayService } from './review-tray.service';
import { ConcurrencyService } from './concurrency.service';
import { ResolutionService } from './resolution.service';

@Module({
  controllers: [ReviewTrayController],
  providers: [ReviewTrayService, ConcurrencyService, ResolutionService],
  exports: [ReviewTrayService, ConcurrencyService, ResolutionService],
})
export class ReviewTrayModule {}
