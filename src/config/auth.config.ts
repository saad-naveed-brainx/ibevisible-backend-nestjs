import { registerAs } from '@nestjs/config';

/** JWT settings for authentication (see .env.example). */
export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
}));
