import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContentType } from '../content.types';

/**
 * Payload to create a content item (FR-2.1). A new item is always created in
 * Draft (FR-2.5), so `status` is not accepted here. Type-specific fields go in
 * `metadata`; they are validated against the type registry only at publish
 * time (FR-2.6), keeping drafts freely editable.
 */
export class CreateContentDto {
  @IsEnum(ContentType, { message: 'A supported content type is required.' })
  type: ContentType;

  @IsString()
  @MinLength(1, { message: 'Title is required.' })
  @MaxLength(255)
  title: string;

  /** Optional; a URL-safe slug is generated from the title when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
