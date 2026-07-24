import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { ContentStatus, ContentType } from './content.types';
import type { ContentMetadata } from './content.types';

/**
 * The shared base entity for all five content types (scope §8). Common fields
 * are first-class columns; type-specific fields live in the `metadata` JSONB
 * column, keyed by `type`. The visibility layer (meta tags, JSON-LD, canonical
 * URL) is derived from this row at render time, never stored separately.
 *
 * All content is scoped to the owning organization (FR-1.2). Slugs are unique
 * within an organization (FR-2.4).
 */
@Entity({ name: 'content_items' })
// Duplicate-slug prevention within an organization (FR-2.4).
@Index('UQ_content_items_org_slug', ['organizationId', 'slug'], {
  unique: true,
})
// Filtering the content list by type and by status (FR-3.3), ordered by
// last-updated (FR-3.2).
@Index('IDX_content_items_org_type', ['organizationId', 'type'])
@Index('IDX_content_items_org_status', ['organizationId', 'status'])
@Index('IDX_content_items_org_updated_at', ['organizationId', 'updatedAt'])
export class ContentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, (organization) => organization.contentItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * One of the five supported types (scope §6.2). Stored as varchar rather
   * than a native enum so a new type can be added via the config registry
   * without a schema migration (NFR-5).
   */
  @Column({ type: 'varchar', length: 32 })
  type: ContentType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** URL-safe slug generated from the title, editable by the user (FR-2.3). */
  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'varchar', length: 16, default: ContentStatus.Draft })
  status: ContentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author: string | null;

  /** Free-form tags/taxonomy (scope §6.2). Stored as a JSON string array. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  /** Type-specific fields, shaped per `type` (see ContentMetadata). */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: ContentMetadata;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** Set when the item is first published (FR-3.7); null while in Draft. */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}
