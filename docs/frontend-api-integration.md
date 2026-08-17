# iBeVisible API — Frontend Integration Guide

Everything the frontend needs to integrate the current POC backend (auth +
content authoring/management). Covers base setup, auth flow, every endpoint,
request/response shapes, errors, and copy-paste TypeScript types.

---

## 1. Base setup

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000/api` (override via env) |
| Content type | `application/json` |
| Auth scheme | Bearer JWT — `Authorization: Bearer <accessToken>` |
| CORS | Dev origin `http://localhost:5173` is allowed (set `CORS_ORIGIN` on the backend to change) |

All routes are prefixed with `/api`. All **content** routes require the
`Authorization` header. Auth `signup`/`login` are public; `me`/`logout` require the header.

### Validation & error format

Payloads are validated and **unknown fields are rejected** (`forbidNonWhitelisted`).
Errors use Nest's standard shape:

```json
{ "statusCode": 400, "message": ["Title is required."], "error": "Bad Request" }
```

`message` is a string for most errors and a **string array** for DTO validation
failures — handle both.

| Status | When |
|---|---|
| `400` | Validation failed / invalid slug / publishing with missing required fields |
| `401` | Missing/invalid/expired token |
| `404` | Item not found (or not owned by your organization) |
| `409` | Duplicate slug, or email already registered on signup |

---

## 2. Auth

### `POST /api/auth/signup` — register
Public. Supports **multi-organization** signup in two modes:

**1. Create a new organization** (no `inviteToken`) — `organizationName` is required and becomes a brand-new tenant with this user as its first member, with role **`owner`**:
```json
{ "email": "owner@shop.com", "password": "at-least-8-chars", "fullName": "Jane Doe", "organizationName": "Jane's Shop" }
```

**2. Join via invite** (`inviteToken` present) — `organizationName` is ignored; the email **must match** the invited email exactly, or the request fails with `400`. The new user's role is always **`content_creator`**:
```json
{ "email": "teammate@shop.com", "password": "at-least-8-chars", "fullName": "Sam", "inviteToken": "<token from the invite link>" }
```

`fullName` is optional in both modes. Response `201`: `AuthResult` (see types).
Invalid/expired/already-used invite token, or an email/invite mismatch → `400`.

### Roles ("invite content creators")
Every user has a `role`, set once at signup and never changed:
- **`owner`** — created the organization. Can invite/revoke content creators and see pending invites.
- **`content_creator`** — joined via an invite link. Can see the team roster but cannot manage invites (`403` on invite-management routes below). Content authoring (§4) is unrestricted for both roles.

### `POST /api/auth/login` — authenticate
Public. Request: `{ "email", "password" }`. Response `200`: `AuthResult`.
Wrong credentials → `401`.

### `GET /api/auth/me` — current profile
Auth required. Response `200`: `UserProfile`.

### `POST /api/auth/logout`
Auth required. Response `200`: `{ "success": true }`.
JWTs are stateless — also discard the token client-side.

> **Token handling:** store `accessToken` from signup/login (e.g. memory +
> `localStorage`), attach it to every subsequent request, and clear it on logout
> or on any `401`.

---

## 3. Organizations & team (multi-organization support)

Every organization is an isolated tenant — a user belongs to exactly one, and
every route below acts only on the caller's own organization.

### `GET /api/organizations/me` — the caller's organization
Auth required. Response `200`: `OrganizationProfile`.

### `GET /api/organizations/members` — everyone in the caller's organization
Auth required (any role). Response `200`: `OrganizationMember[]` — each row
includes `role` (`owner` | `content_creator`).

### `POST /api/organizations/invitations` — invite a content creator
**Owner-only** (`403` for content creators). Request:
`{ "email": "teammate@shop.com" }`. Response `201`: `CreatedInvitation` —
**the `token` is only ever returned here**; build the invite link
client-side as `{origin}/signup?invite={token}` and share it out-of-band
(there is no email-sending in the POC). Invitations expire after 7 days.

### `GET /api/organizations/invitations` — invites sent from this organization
**Owner-only** (`403` for content creators). Response `200`:
`InvitationSummary[]` (status is `pending`, `accepted`, or `expired`; the
token itself is never re-exposed).

### `DELETE /api/organizations/invitations/:id` — revoke a pending invite
**Owner-only** (`403` for content creators), scoped to the caller's
organization. Response `204`. Not found / not yours / already accepted →
`404`/`403`.

### `GET /api/organizations/invitations/:token` — preview an invite
Public (no auth) — used by the signup page to show which organization a link
belongs to before an account exists. Response `200`: `InvitationPreview`.
Invalid/expired token → `404`.

---

## 4. Content

All routes require auth and act only on **your** organization's content.

### `GET /api/content/types` — content-type registry
Returns the config-driven definition of each type — use this to drive the editor
(which fields to show per type) and to know each type's publish requirements.
Response `200`: `ContentTypeDefinition[]`.

```json
[
  { "type": "article", "label": "Article", "schemaType": "Article",
    "requiredToPublish": ["title", "slug", "body"] },
  { "type": "newsletter", "label": "Newsletter", "schemaType": "Article",
    "requiredToPublish": ["title", "slug", "body", "metadata.subjectLine"] },
  { "type": "social_post", "label": "Social Post", "schemaType": "SocialMediaPosting",
    "requiredToPublish": ["title", "slug", "body", "metadata.platform"] },
  { "type": "video", "label": "Video", "schemaType": "VideoObject",
    "requiredToPublish": ["title", "slug", "metadata.videoUrl"] },
  { "type": "podcast", "label": "Podcast", "schemaType": "PodcastEpisode",
    "requiredToPublish": ["title", "slug", "metadata.audioUrl"] }
]
```

### `POST /api/content` — create (always Draft)
Request body = `CreateContentDto`:

| Field | Required | Notes |
|---|---|---|
| `type` | ✅ | one of the five content types |
| `title` | ✅ | 1–255 chars |
| `slug` | — | auto-generated from title if omitted; must be URL-safe |
| `summary` | — | text |
| `body` | — | text (the main content / social post text) |
| `author` | — | |
| `tags` | — | `string[]` |
| `metadata` | — | type-specific object (see §4) |

New items are created as `draft`; `status` and `publishedAt` cannot be set here.
Response `201`: `ContentItemResponse`. Duplicate slug → `409`.

### `GET /api/content` — list
Query params (both optional): `?type=<ContentType>&status=<draft|published>`.
Returns condensed rows sorted by most-recently-updated. Response `200`: `ContentListItem[]`.

```
GET /api/content?type=article&status=draft
```

### `GET /api/content/:id` — full item (edit view)
Response `200`: `ContentItemResponse`. Not found / not yours → `404`.

### `PATCH /api/content/:id` — edit
Partial update. Body = `UpdateContentDto` — any subset of `title`, `slug`,
`summary`, `body`, `author`, `tags`, `metadata`. **`type` is immutable** and
**`status` is not changed here** (use publish/unpublish). Changing `title` or
`slug` re-validates slug uniqueness. Response `200`: `ContentItemResponse`.

### `DELETE /api/content/:id` — delete
Response `204` (no body).

### `POST /api/content/:id/publish` — publish
Validates the type's `requiredToPublish` fields first; if any are missing →
`400` with a message listing them. Sets `status=published` and stamps
`publishedAt` on first publish. Response `200`: `ContentItemResponse`.

### `POST /api/content/:id/unpublish` — back to Draft
Sets `status=draft` (keeps `publishedAt`). Response `200`: `ContentItemResponse`.

---

## 5. Type-specific `metadata` per content type

Base fields (`title`, `slug`, `summary`, `body`, `tags`, `author`) live at the
top level. The `metadata` object holds the fields unique to each type:

| Type | `metadata` fields |
|---|---|
| `article` | *(none — base fields only)* |
| `newsletter` | `subjectLine` (string, required to publish), `previewText?`, `issueNumber?` (number) |
| `social_post` | `platform` (string, e.g. `"X"`/`"LinkedIn"`, required to publish), `link?`, `hashtags` (string[]) |
| `video` | `videoUrl` (string, required to publish), `duration?`, `thumbnailUrl?`, `transcript?` |
| `podcast` | `audioUrl` (string, required to publish), `episodeNumber?` (number), `duration?`, `showNotes?` |

> Media (video/podcast) is referenced by **URL only** in the POC — there is no
> file upload. `duration` is a free string (e.g. ISO-8601 `"PT8M30S"` or `"8:30"`).

Example — create a video:
```json
POST /api/content
{
  "type": "video",
  "title": "How to set up your storefront",
  "body": "Step-by-step walkthrough...",
  "tags": ["tutorial", "onboarding"],
  "metadata": {
    "videoUrl": "https://cdn.example.com/v/123.mp4",
    "duration": "PT8M30S",
    "thumbnailUrl": "https://cdn.example.com/v/123.jpg"
  }
}
```

---

## 5a. AI content drafting

### `POST /api/ai/generate-content` — generate a draft

Auth required. Takes a content type and a free-text brief; returns a draft shaped
like `CreateContentDto` (minus `type`) for the caller to review and edit before
saving — nothing is created or persisted by this call.

Request:

```json
{ "type": "newsletter", "prompt": "Announce our new storefront theme, upbeat tone" }
```

Response `200`:

```json
{
  "title": "Say Hello to Our New Storefront Theme",
  "summary": "We've refreshed the storefront with a faster, cleaner design.",
  "body": "We're excited to introduce...",
  "tags": ["product", "announcement"],
  "metadata": { "subjectLine": "Your storefront just got a facelift", "previewText": "See what's new", "issueNumber": null }
}
```

`metadata` always includes every field the type defines (see §5); fields the
model can't know (e.g. `videoUrl`, `audioUrl`) come back as an empty string —
the user fills those in manually. `400` on an unsupported `type` or empty
`prompt`; `500` if the generation call itself fails (rare — surface the message
and let the user retry).

---

## 6. TypeScript types (copy into the frontend)

```ts
// ---- enums ----
export type ContentType =
  | 'article' | 'newsletter' | 'social_post' | 'video' | 'podcast';
export type ContentStatus = 'draft' | 'published';

// ---- auth ----
export type UserRole = 'owner' | 'content_creator';
export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  organizationId: string;
  role: UserRole;
  createdAt: string; // ISO date
}
export interface AuthResult {
  accessToken: string;
  user: UserProfile;
}

// ---- organizations & invitations ----
export interface OrganizationProfile {
  id: string;
  name: string;
  baseDomain: string | null;
  createdAt: string; // ISO date
}
export interface OrganizationMember {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string; // ISO date
}
export interface InvitationSummary {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string; // ISO date
  expiresAt: string; // ISO date
}
export interface CreatedInvitation {
  id: string;
  email: string;
  token: string;      // only ever returned here — build the invite link client-side
  expiresAt: string;  // ISO date
}
export interface InvitationPreview {
  organizationName: string;
  email: string;
}

// ---- content: type-specific metadata ----
export type ArticleMetadata = Record<string, never>;
export interface NewsletterMetadata {
  subjectLine: string;
  previewText?: string | null;
  issueNumber?: number | null;
}
export interface SocialPostMetadata {
  platform: string;
  link?: string | null;
  hashtags: string[];
}
export interface VideoMetadata {
  videoUrl: string;
  duration?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
}
export interface PodcastMetadata {
  audioUrl: string;
  episodeNumber?: number | null;
  duration?: string | null;
  showNotes?: string | null;
}
export type ContentMetadata =
  | ArticleMetadata | NewsletterMetadata | SocialPostMetadata
  | VideoMetadata | PodcastMetadata;

// ---- content: registry (GET /content/types) ----
export interface ContentTypeDefinition {
  type: ContentType;
  label: string;
  schemaType: string;
  requiredToPublish: string[]; // dot-paths, e.g. "metadata.videoUrl"
}

// ---- content: responses ----
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
  createdAt: string;   // ISO date
  updatedAt: string;   // ISO date
  publishedAt: string | null;
}
export interface ContentListItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  updatedAt: string;
}

// ---- content: request payloads ----
export interface CreateContentInput {
  type: ContentType;
  title: string;
  slug?: string;
  summary?: string;
  body?: string;
  author?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
export type UpdateContentInput = Partial<Omit<CreateContentInput, 'type'>>;

// ---- content: AI drafting ----
export interface GeneratedContentDraft {
  title: string;
  summary: string;
  body: string;
  tags: string[];
  metadata: Record<string, unknown>;
}
```

---

## 7. Minimal fetch client

```ts
const BASE_URL = 'http://localhost:3000/api';
let token: string | null = localStorage.getItem('accessToken');

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    token = null;
    localStorage.removeItem('accessToken');
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// auth
export async function login(email: string, password: string) {
  const result = await api<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  token = result.accessToken;
  localStorage.setItem('accessToken', token);
  return result;
}
export const signup = (body: {
  email: string;
  password: string;
  fullName?: string;
  organizationName?: string; // required unless inviteToken is set
  inviteToken?: string;      // join that invite's org instead of creating one
}) =>
  api<AuthResult>('/auth/signup', { method: 'POST', body: JSON.stringify(body) })
    .then((r) => { token = r.accessToken; localStorage.setItem('accessToken', token); return r; });
export const me = () => api<UserProfile>('/auth/me');
export const logout = () =>
  api<{ success: true }>('/auth/logout', { method: 'POST' })
    .finally(() => { token = null; localStorage.removeItem('accessToken'); });

// organizations & team
export const getMyOrganization = () => api<OrganizationProfile>('/organizations/me');
export const listMembers = () => api<OrganizationMember[]>('/organizations/members');
export const listInvitations = () => api<InvitationSummary[]>('/organizations/invitations');
export const inviteTeammate = (email: string) =>
  api<CreatedInvitation>('/organizations/invitations', { method: 'POST', body: JSON.stringify({ email }) });
export const revokeInvitation = (id: string) =>
  api<void>(`/organizations/invitations/${id}`, { method: 'DELETE' });
export const previewInvitation = (token: string) =>
  api<InvitationPreview>(`/organizations/invitations/${token}`);

// content
export const getContentTypes = () => api<ContentTypeDefinition[]>('/content/types');
export const listContent = (q: { type?: ContentType; status?: ContentStatus } = {}) => {
  const qs = new URLSearchParams(q as Record<string, string>).toString();
  return api<ContentListItem[]>(`/content${qs ? `?${qs}` : ''}`);
};
export const getContent = (id: string) => api<ContentItemResponse>(`/content/${id}`);
export const createContent = (body: CreateContentInput) =>
  api<ContentItemResponse>('/content', { method: 'POST', body: JSON.stringify(body) });
export const updateContent = (id: string, body: UpdateContentInput) =>
  api<ContentItemResponse>(`/content/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteContent = (id: string) =>
  api<void>(`/content/${id}`, { method: 'DELETE' });
export const publishContent = (id: string) =>
  api<ContentItemResponse>(`/content/${id}/publish`, { method: 'POST' });
export const unpublishContent = (id: string) =>
  api<ContentItemResponse>(`/content/${id}/unpublish`, { method: 'POST' });

// AI drafting
export const generateContent = (type: ContentType, prompt: string) =>
  api<GeneratedContentDraft>('/ai/generate-content', {
    method: 'POST',
    body: JSON.stringify({ type, prompt }),
  });
```

---

## 8. Suggested UI flow

1. **Auth gate** — signup (new org, or via `?invite=<token>` link → preview +
   join) / login → store token → route to workspace.
2. **Team page** — `GET /organizations/me` + `/members` + `/invitations` to
   show the workspace and who's in it; invite form posts to
   `/organizations/invitations` and surfaces the returned `token` as a
   shareable `{origin}/signup?invite={token}` link (there is no
   email-sending in the POC).
4. **Content list** (`GET /content`) — table of type/title/status/updated, with
   type & status filter dropdowns (`?type=&status=`).
5. **Create** — pick a type, fetch `GET /content/types` once to know which
   `metadata` fields to render for the chosen type, submit `POST /content`.
   Optionally, describe the content in a prompt box first and call
   `POST /ai/generate-content` to prefill the form — the user still reviews
   and edits before saving.
6. **Edit** — `GET /content/:id` → form → `PATCH /content/:id`.
7. **Publish/Unpublish** — buttons calling the publish/unpublish endpoints;
   on a `400`, surface the "missing required field(s)" message next to the form.
8. **Delete** — confirm dialog → `DELETE /content/:id`.

> Not yet built (later stages, scope §13): public rendered pages, SEO/JSON-LD
> metadata, sitemap/robots. Those will add public read endpoints.
>
> AI-assist (§5a) is now available: `POST /api/ai/generate-content` drafts a
> full content item from a type + prompt for the user to review before saving.
