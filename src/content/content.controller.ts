import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ContentService } from './content.service';
import {
  CONTENT_TYPE_REGISTRY,
  ContentItemResponse,
  ContentListItem,
  ContentTypeDefinition,
} from './content.types';
import { CreateContentDto } from './dto/create-content.dto';
import { ListContentQueryDto } from './dto/list-content-query.dto';
import { UpdateContentDto } from './dto/update-content.dto';

/**
 * Content authoring & management API (scope §6.2, §6.3). Every route requires
 * authentication and operates only on the caller's organization (FR-1.2, NFR-3).
 */
@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /**
   * GET /api/content/types — the config-driven content-type registry so the
   * editor can render the fields relevant to each type (FR-2.2, NFR-5).
   * Declared before the `:id` routes so "types" is not read as an id.
   */
  @Get('types')
  listTypes(): ContentTypeDefinition[] {
    return Object.values(CONTENT_TYPE_REGISTRY);
  }

  /** POST /api/content — create a Draft item (FR-2.1, FR-2.5). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContentDto,
  ): Promise<ContentItemResponse> {
    return this.content.create(user.organizationId, dto);
  }

  /** GET /api/content — list items, filter by type/status (FR-3.1–3.3). */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContentQueryDto,
  ): Promise<ContentListItem[]> {
    return this.content.list(user.organizationId, query);
  }

  /** GET /api/content/:id — full item for editing (FR-3.4). */
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentItemResponse> {
    return this.content.findOne(user.organizationId, id);
  }

  /** PATCH /api/content/:id — edit and save (FR-3.4). */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
  ): Promise<ContentItemResponse> {
    return this.content.update(user.organizationId, id, dto);
  }

  /** DELETE /api/content/:id — delete (FR-3.5). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.content.remove(user.organizationId, id);
  }

  /** POST /api/content/:id/publish — move to Published (FR-3.6, FR-3.7). */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentItemResponse> {
    return this.content.publish(user.organizationId, id);
  }

  /** POST /api/content/:id/unpublish — move back to Draft (FR-3.6). */
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentItemResponse> {
    return this.content.unpublish(user.organizationId, id);
  }
}
