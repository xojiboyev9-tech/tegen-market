import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { env } from '../common/env';
import { PrismaService } from '../common/prisma.service';
import { TgUser, validateInitData } from '../common/telegram-auth';

export const publicUser = (u: User & { categories?: { categoryId: number }[] }) => ({
  id: u.id,
  telegramId: u.telegramId.toString(),
  name: u.name,
  phone: u.phone,
  role: u.role,
  categoryIds: u.categories?.map((c) => c.categoryId) ?? [],
});

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  sign(user: { id: number; role: Role }, expiresIn = '12h') {
    return this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn });
  }

  /** Foydalanuvchini topadi yoki yaratadi. SUPER_ADMIN_TELEGRAM_IDS dagilar avtomatik Super Admin bo'ladi. */
  async upsertTelegramUser(tg: { id: number | bigint; username?: string; first_name?: string }) {
    const telegramId = BigInt(tg.id);
    const isBootstrapAdmin = env.superAdminIds.includes(telegramId.toString());
    return this.prisma.user.upsert({
      where: { telegramId },
      update: { username: tg.username ?? null, ...(isBootstrapAdmin ? { role: 'SUPER_ADMIN' } : {}) },
      create: {
        telegramId,
        username: tg.username ?? null,
        name: tg.first_name ?? null,
        role: isBootstrapAdmin ? 'SUPER_ADMIN' : 'CUSTOMER',
      },
      include: { categories: true },
    });
  }

  async loginWithInitData(initData: string) {
    let tg: TgUser;
    if (!env.isProd && initData.startsWith('dev:')) {
      // Faqat ishlab chiqishda: initData o'rniga "dev:<telegramId>"
      tg = { id: Number(initData.slice(4)), first_name: 'Dev', username: 'dev' };
    } else {
      tg = validateInitData(initData, env.botToken, 24 * 3600);
    }
    const user = await this.upsertTelegramUser(tg);
    return { token: await this.sign(user), user: publicUser(user) };
  }
}
