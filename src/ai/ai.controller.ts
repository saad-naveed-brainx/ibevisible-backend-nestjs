import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { GeneratedContentDraft } from './ai.types';
import { GenerateContentDto } from './dto/generate-content.dto';

/** AI drafting endpoint (docs §8: "an AI drafting endpoint"). */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * POST /api/ai/generate-content — generate a draft for the given content
   * type from a free-text prompt. Returns a draft shaped like
   * `CreateContentDto`; the caller still reviews and saves it explicitly.
   */
  @Post('generate-content')
  @HttpCode(HttpStatus.OK)
  generateContent(
    @Body() dto: GenerateContentDto,
  ): Promise<GeneratedContentDraft> {
    return this.ai.generateContent(dto.type, dto.prompt);
  }
}
