import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix all routes with /api (e.g. GET /api/health)
  app.setGlobalPrefix('api');

  // Validate and strip incoming payloads against the DTOs (NFR-3).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Allow requests from any origin.
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`iBeVisible API running on http://localhost:${port}/api`);
}
bootstrap();