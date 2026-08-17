/**
 * AI-generated draft for a content item. Shaped like `CreateContentDto` (minus
 * `type`, which the caller already knows) so the frontend can drop the result
 * straight into the editor form.
 */
export interface GeneratedContentDraft {
  title: string;
  summary: string;
  body: string;
  tags: string[];
  metadata: Record<string, unknown>;
}
