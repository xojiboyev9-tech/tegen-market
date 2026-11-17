import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** Telegram Mini App initData imzosini tekshiradi (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app) */
export function validateInitData(initData: string, botToken: string, maxAgeSec: number): TgUser {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new UnauthorizedException('initData yaroqsiz');
  params.delete('hash');
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new UnauthorizedException('initData imzosi noto\'g\'ri');
  }
  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) throw new UnauthorizedException('initData eskirgan');
  try {
    const user = JSON.parse(params.get('user') ?? '');
    if (!user?.id) throw new Error();
    return user as TgUser;
  } catch {
    throw new UnauthorizedException('user topilmadi');
  }
}
