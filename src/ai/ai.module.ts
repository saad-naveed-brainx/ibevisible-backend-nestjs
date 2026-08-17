import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

/** AI content-drafting module (docs §8, scope §13). */
@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
