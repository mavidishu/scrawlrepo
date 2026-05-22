import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, LogLevel } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Respect LOG_LEVEL environment variable (values: error, warn, info, debug, verbose)
  const desiredLevel = (process.env.LOG_LEVEL || 'debug').toLowerCase();
  const levelMap: Record<string, LogLevel[]> = {
    error: ['error'],
    warn: ['error', 'warn'],
    info: ['error', 'warn', 'log'],
    debug: ['error', 'warn', 'log', 'debug'],
    verbose: ['error', 'warn', 'log', 'debug', 'verbose'],
  };
  const loggerLevels: LogLevel[] = levelMap[desiredLevel] ?? levelMap.debug;

  const app = await NestFactory.create(AppModule, { logger: loggerLevels });

  // Small startup log about effective levels
  Logger.log(`Effective Nest logger levels: ${loggerLevels.join(',')}`, 'Bootstrap');

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}`);
}

bootstrap();
