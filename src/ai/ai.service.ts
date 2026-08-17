import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ContentType } from '../content/content.types';
import { GeneratedContentDraft } from './ai.types';

const MODEL = 'gpt-4o-mini';

/** JSON schema for each type's `metadata` shape (content.types.ts). */
const METADATA_SCHEMA: Record<ContentType, Record<string, unknown>> = {
  [ContentType.Article]: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  [ContentType.Newsletter]: {
    type: 'object',
    properties: {
      subjectLine: { type: 'string' },
      previewText: { type: 'string' },
      issueNumber: { type: 'number' },
    },
    required: ['subjectLine', 'previewText', 'issueNumber'],
    additionalProperties: false,
  },
  [ContentType.SocialPost]: {
    type: 'object',
    properties: {
      platform: { type: 'string' },
      link: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
    },
    required: ['platform', 'link', 'hashtags'],
    additionalProperties: false,
  },
  [ContentType.Video]: {
    type: 'object',
    properties: {
      videoUrl: { type: 'string' },
      duration: { type: 'string' },
      thumbnailUrl: { type: 'string' },
      transcript: { type: 'string' },
    },
    required: ['videoUrl', 'duration', 'thumbnailUrl', 'transcript'],
    additionalProperties: false,
  },
  [ContentType.Podcast]: {
    type: 'object',
    properties: {
      audioUrl: { type: 'string' },
      episodeNumber: { type: 'number' },
      duration: { type: 'string' },
      showNotes: { type: 'string' },
    },
    required: ['audioUrl', 'episodeNumber', 'duration', 'showNotes'],
    additionalProperties: false,
  },
};

const TYPE_GUIDANCE: Record<ContentType, string> = {
  [ContentType.Article]: 'A long-form article body, written in full prose.',
  [ContentType.Newsletter]:
    'An email newsletter body. `subjectLine` is the email subject; `previewText` is the inbox preview snippet.',
  [ContentType.SocialPost]:
    'A short social media post. `body` is the post text itself (keep it appropriately brief for the platform); `hashtags` should not include the "#" character.',
  [ContentType.Video]:
    'A video description. `body` is the video description shown to viewers; `videoUrl` and `thumbnailUrl` are not known yet, so return empty strings for those two fields — do not invent URLs.',
  [ContentType.Podcast]:
    'A podcast episode description. `body` is the episode description; `showNotes` is a longer set of notes/timestamps. `audioUrl` is not known yet, so return an empty string — do not invent a URL.',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('ai.openaiApiKey'),
    });
  }

  /** Generate a type-aware draft from a free-text prompt. */
  async generateContent(
    type: ContentType,
    prompt: string,
  ): Promise<GeneratedContentDraft> {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        body: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        metadata: METADATA_SCHEMA[type],
      },
      required: ['title', 'summary', 'body', 'tags', 'metadata'],
      additionalProperties: false,
    };

    const system = `You draft content for a small-business content platform. Given a short brief from the user, write a complete draft for a content item of type "${type}".

${TYPE_GUIDANCE[type]}

- \`title\` is a concise, publish-ready title.
- \`summary\` is a one- or two-sentence description used for previews and meta descriptions.
- \`tags\` is 2-5 relevant topical tags (no "#").
- Fill every field in the schema. Where a real value cannot be known (e.g. a media URL), return an empty string rather than inventing one.
- Write only the draft content itself — no preamble, no notes about what you did.`;

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'content_draft',
            schema,
            strict: true,
          },
        },
      });
    } catch (err) {
      this.logger.error('OpenAI content generation request failed', err);
      throw new InternalServerErrorException(
        'Unable to generate content right now. Please try again.',
      );
    }

    const text = response.choices[0]?.message?.content;
    if (!text) {
      this.logger.error(
        `OpenAI response for type ${type} had no content (finish_reason=${response.choices[0]?.finish_reason})`,
      );
      throw new InternalServerErrorException(
        'The AI did not return a draft. Please try again.',
      );
    }

    return JSON.parse(text) as GeneratedContentDraft;
  }
}
