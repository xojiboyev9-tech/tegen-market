import { config } from 'dotenv';

// Lokal ishlab chiqishda ildizdagi .env o'qiladi; productionda muhit o'zgaruvchilari tayyor bo'ladi
config({ path: ['.env', '../.env'] });

const need = (k: string, fallback?: string) => {
  const v = process.env[k] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Env ${k} kerak`);
  return v;
};

const isProd = process.env.NODE_ENV === 'production';

// Productionda zaif yoki namunadagi sirlar bilan ishga tushmaymiz
if (isProd) {
  for (const k of ['BOT_SECRET', 'JWT_SECRET']) {
    const v = process.env[k] ?? '';
    if (v.length < 32 || /change-me|dev-|secret123/i.test(v)) {
      throw new Error(`Env ${k} kamida 32 belgili tasodifiy qiymat bo'lishi kerak (openssl rand -hex 32)`);
    }
  }
  if (!process.env.DATABASE_URL) throw new Error('Env DATABASE_URL kerak');
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  botToken: need('BOT_TOKEN', isProd ? undefined : 'dev'),
  botSecret: need('BOT_SECRET', isProd ? undefined : 'dev-bot-secret'),
  jwtSecret: need('JWT_SECRET', isProd ? undefined : 'dev-jwt-secret'),
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  gcsBucket: process.env.GCS_BUCKET ?? '',
  superAdminIds: (process.env.SUPER_ADMIN_TELEGRAM_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
};
