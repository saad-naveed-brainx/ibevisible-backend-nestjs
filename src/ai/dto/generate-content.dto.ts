import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ContentType } from '../../content/content.types';

/** Payload to request an AI-generated draft for a content type. */
export class GenerateContentDto {
  @IsEnum(ContentType, { message: 'A supported content type is required.' })
  type: ContentType;

  /** What the user wants written, e.g. a topic, angle, or key points. */
  @IsString()
  @MinLength(1, { message: 'A prompt is required.' })
  @MaxLength(2000)
  prompt: string;
}
