import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './common/env';

// Prisma BigInt (telegramId) ni JSON ga o'tkazish uchun
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () { return this.toString(); };

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // Cloud Run / Nginx orqasida haqiqiy IP uchun
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: env.corsOrigins.length ? env.corsOrigins : env.isProd ? false : true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.useBodyParser('json', { limit: '256kb' });
  // Lokal rasm saqlash (GCS_BUCKET bo'lmaganda)
  if (!env.gcsBucket) app.useStaticAssets(env.uploadDir, { prefix: '/uploads', maxAge: '7d' });
  app.enableShutdownHooks();
  await app.listen(env.port, '0.0.0.0');
}
bootstrap();
