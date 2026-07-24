/**
 * Generates a URL-safe slug from a title (FR-2.3): lowercased, accents
 * stripped, non-alphanumeric runs collapsed to single hyphens, and
 * leading/trailing hyphens trimmed.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** True when the value is already a valid slug (no normalization needed). */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
