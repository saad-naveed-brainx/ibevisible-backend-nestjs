import { registerAs } from '@nestjs/config';

/**
 * PostgreSQL connection settings, sourced from environment variables.
 * See .env.example for the expected keys.
 */
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  user: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? '',
  name: process.env.DATABASE_NAME ?? 'postgres',
}));
