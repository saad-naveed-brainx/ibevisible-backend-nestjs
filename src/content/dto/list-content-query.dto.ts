import { IsEnum, IsOptional } from 'class-validator';
import { ContentStatus, ContentType } from '../content.types';

/** Query params to filter the content list by type and/or status (FR-3.3). */
export class ListContentQueryDto {
  @IsOptional()
  @IsEnum(ContentType, { message: 'Unknown content type filter.' })
  type?: ContentType;

  @IsOptional()
  @IsEnum(ContentStatus, { message: 'Unknown status filter.' })
  status?: ContentStatus;
}
