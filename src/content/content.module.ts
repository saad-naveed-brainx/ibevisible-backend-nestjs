import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentItem } from './content-item.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

/**
 * Content domain module (scope §6.2–§6.4). Exposes authoring & management APIs
 * over the shared ContentItem entity; the visibility engine builds on the same
 * service in a later stage (scope §13).
 */
@Module({
  imports: [TypeOrmModule.forFeature([ContentItem])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
