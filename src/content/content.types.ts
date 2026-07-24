/**
 * Content domain types for the visibility platform (scope §6, §8).
 *
 * The POC represents five heterogeneous content types with a single shared
 * base entity plus type-specific fields held as structured JSON metadata,
 * rather than five separate tables (scope §8, risk mitigation). The registry
 * below keeps type definitions config-driven so a new type can be added with
 * minimal change (NFR-5).
 */

/** The five supported content types (scope §3.1, §6.2). */
export enum ContentType {
  Article = 'article',
  Newsletter = 'newsletter',
  SocialPost = 'social_post',
  Video = 'video',
  Podcast = 'podcast',
}

/** The two content states in the POC lifecycle (scope §1.4, FR-3.6). */
export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
}

/* ------------------------------------------------------------------ *
 * Type-specific metadata shapes (scope §6.2 "Content type fields").
 * Base fields (title, slug, summary, body, tags, author, status,
 * timestamps) live as first-class columns on ContentItem; only the
 * fields unique to a type are held here in the `metadata` JSONB column.
 * ------------------------------------------------------------------ */

/** Article adds no fields beyond the shared base. */
export type ArticleMetadata = Record<string, never>;

export interface NewsletterMetadata {
  subjectLine: string;
  previewText?: string | null;
  issueNumber?: number | null;
}

export interface SocialPostMetadata {
  /** Target platform, e.g. "X", "LinkedIn". */
  platform: string;
  link?: string | null;
  hashtags: string[];
}

export interface VideoMetadata {
  /** Media is referenced by URL only; the POC does not host it (Decision D2). */
  videoUrl: string;
  /** ISO-8601 duration (e.g. "PT8M30S") or a human span. */
  duration?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
}

export interface PodcastMetadata {
  /** Media is referenced by URL only; the POC does not host it (Decision D2). */
  audioUrl: string;
  episodeNumber?: number | null;
  duration?: string | null;
  showNotes?: string | null;
}

export type ContentMetadata =
  | ArticleMetadata
  | NewsletterMetadata
  | SocialPostMetadata
  | VideoMetadata
  | PodcastMetadata;

/**
 * Config-driven definition of a content type (NFR-5). Adding a type means
 * adding an entry here plus its metadata shape above — no DB migration or
 * per-type branching elsewhere.
 */
export interface ContentTypeDefinition {
  type: ContentType;
  label: string;
  /** Schema.org @type emitted in the JSON-LD of the public page (FR-4.4). */
  schemaType: string;
  /**
   * Dot-path fields (base columns or `metadata.*`) that must be present
   * before an item of this type can be published (FR-2.6).
   */
  requiredToPublish: string[];
}

/** Full content item as returned to the client (edit view, FR-3.4). */
export interface ContentItemResponse {
  id: string;
  organizationId: string;
  type: ContentType;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  status: ContentStatus;
  author: string | null;
  tags: string[];
  metadata: ContentMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

/** Condensed row for the content list (FR-3.2). */
export interface ContentListItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  updatedAt: Date;
}

export const CONTENT_TYPE_REGISTRY: Record<ContentType, ContentTypeDefinition> =
  {
    [ContentType.Article]: {
      type: ContentType.Article,
      label: 'Article',
      schemaType: 'Article',
      requiredToPublish: ['title', 'slug', 'body'],
    },
    [ContentType.Newsletter]: {
      type: ContentType.Newsletter,
      label: 'Newsletter',
      // Scope §6.4: Article/NewsArticle for newsletters.
      schemaType: 'Article',
      requiredToPublish: ['title', 'slug', 'body', 'metadata.subjectLine'],
    },
    [ContentType.SocialPost]: {
      type: ContentType.SocialPost,
      label: 'Social Post',
      schemaType: 'SocialMediaPosting',
      requiredToPublish: ['title', 'slug', 'body', 'metadata.platform'],
    },
    [ContentType.Video]: {
      type: ContentType.Video,
      label: 'Video',
      schemaType: 'VideoObject',
      requiredToPublish: ['title', 'slug', 'metadata.videoUrl'],
    },
    [ContentType.Podcast]: {
      type: ContentType.Podcast,
      label: 'Podcast',
      schemaType: 'PodcastEpisode',
      requiredToPublish: ['title', 'slug', 'metadata.audioUrl'],
    },
  };
