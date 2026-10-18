import { Global, Module } from '@nestjs/common';
import { PiiMaskingService } from './services/pii-masking.service';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Global()
@Module({
  providers: [PiiMaskingService, HttpExceptionFilter],
  exports: [PiiMaskingService, HttpExceptionFilter],
})
export class CommonModule {}
