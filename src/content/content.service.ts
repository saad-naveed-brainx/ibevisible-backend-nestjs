import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ContentItem } from './content-item.entity';
import {
  CONTENT_TYPE_REGISTRY,
  ContentItemResponse,
  ContentListItem,
  ContentMetadata,
  ContentStatus,
  ContentType,
} from './content.types';
import { CreateContentDto } from './dto/create-content.dto';
import { ListContentQueryDto } from './dto/list-content-query.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { isValidSlug, slugify } from './slug.util';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly items: Repository<ContentItem>,
  ) {}

  /** Create a new item in Draft status (FR-2.1, FR-2.5). */
  async create(
    organizationId: string,
    dto: CreateContentDto,
  ): Promise<ContentItemResponse> {
    const slug = await this.resolveSlug(organizationId, dto.slug, dto.title);

    const item = this.items.create({
      organizationId,
      type: dto.type,
      title: dto.title,
      slug,
      summary: dto.summary ?? null,
      body: dto.body ?? null,
      author: dto.author ?? null,
      tags: dto.tags ?? [],
      metadata: (dto.metadata ?? {}) as ContentMetadata,
      status: ContentStatus.Draft,
      publishedAt: null,
    });

    const saved = await this.items.save(item);
    return this.toResponse(saved);
  }

  /** List all items in the org, optionally filtered by type/status (FR-3.1–3.3). */
  async list(
    organizationId: string,
    query: ListContentQueryDto,
  ): Promise<ContentListItem[]> {
    const rows = await this.items.find({
      where: {
        organizationId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      order: { updatedAt: 'DESC' },
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      slug: row.slug,
      status: row.status,
      updatedAt: row.updatedAt,
    }));
  }

  /** Fetch a single item for editing (FR-3.4). */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<ContentItemResponse> {
    const item = await this.getOwnedOrThrow(organizationId, id);
    return this.toResponse(item);
  }

  /** Edit and save changes to an item (FR-3.4). */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateContentDto,
  ): Promise<ContentItemResponse> {
    const item = await this.getOwnedOrThrow(organizationId, id);

    if (dto.slug !== undefined || dto.title !== undefined) {
      item.slug = await this.resolveSlug(
        organizationId,
        dto.slug ?? item.slug,
        dto.title ?? item.title,
        id,
      );
    }

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.summary !== undefined) item.summary = dto.summary;
    if (dto.body !== undefined) item.body = dto.body;
    if (dto.author !== undefined) item.author = dto.author;
    if (dto.tags !== undefined) item.tags = dto.tags;
    if (dto.metadata !== undefined) {
      item.metadata = dto.metadata as ContentMetadata;
    }

    const saved = await this.items.save(item);
    return this.toResponse(saved);
  }

  /** Delete an item (FR-3.5). */
  async remove(organizationId: string, id: string): Promise<void> {
    const item = await this.getOwnedOrThrow(organizationId, id);
    await this.items.remove(item);
  }

  /**
   * Publish an item (FR-3.6, FR-3.7). Validates the required fields for the
   * item's type (FR-2.6) before making it publicly available. `publishedAt`
   * is set once, on first publish.
   */
  async publish(
    organizationId: string,
    id: string,
  ): Promise<ContentItemResponse> {
    const item = await this.getOwnedOrThrow(organizationId, id);
    this.assertReadyToPublish(item);

    item.status = ContentStatus.Published;
    item.publishedAt = item.publishedAt ?? new Date();

    const saved = await this.items.save(item);
    return this.toResponse(saved);
  }

  /** Move a published item back to Draft (FR-3.6). */
  async unpublish(
    organizationId: string,
    id: string,
  ): Promise<ContentItemResponse> {
    const item = await this.getOwnedOrThrow(organizationId, id);
    item.status = ContentStatus.Draft;
    const saved = await this.items.save(item);
    return this.toResponse(saved);
  }

  /* --------------------------- internals --------------------------- */

  private async getOwnedOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ContentItem> {
    const item = await this.items.findOne({ where: { id, organizationId } });
    if (!item) {
      throw new NotFoundException('Content item not found.');
    }
    return item;
  }

  /**
   * Normalizes/validates the slug and guarantees uniqueness within the org
   * (FR-2.3, FR-2.4). Generates from the title when none is supplied.
   */
  private async resolveSlug(
    organizationId: string,
    slug: string | undefined,
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const candidate = slug?.trim() ? slugify(slug) : slugify(title);

    if (!candidate || !isValidSlug(candidate)) {
      throw new BadRequestException(
        'Could not derive a valid slug; provide one manually.',
      );
    }

    const clash = await this.items.findOne({
      where: {
        organizationId,
        slug: candidate,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        `The slug "${candidate}" is already in use in this organization.`,
      );
    }

    return candidate;
  }

  /** FR-2.6: every field the type registry marks required must be present. */
  private assertReadyToPublish(item: ContentItem): void {
    const definition = CONTENT_TYPE_REGISTRY[item.type];
    const record = item as unknown as Record<string, unknown>;
    const missing = definition.requiredToPublish.filter((path) => {
      const value = path.startsWith('metadata.')
        ? (item.metadata as Record<string, unknown>)?.[path.slice(9)]
        : record[path];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot publish: missing required field(s) for ${definition.label}: ${missing.join(', ')}.`,
      );
    }
  }

  private toResponse(item: ContentItem): ContentItemResponse {
    return {
      id: item.id,
      organizationId: item.organizationId,
      type: item.type,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      body: item.body,
      status: item.status,
      author: item.author,
      tags: item.tags,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      publishedAt: item.publishedAt,
    };
  }
}
