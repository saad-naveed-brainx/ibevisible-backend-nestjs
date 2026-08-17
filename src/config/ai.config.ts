import { registerAs } from '@nestjs/config';

/** OpenAI API settings for AI content generation (see .env.example). */
export default registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
}));
