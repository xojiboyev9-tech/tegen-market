import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const telegramId =
      request.headers['x-telegram-id'] ||
      request.headers['telegram-id'];

    if (!telegramId) {
      throw new UnauthorizedException(
        'Telegram ID yuborilmadi',
      );
    }

    let telegramIdBigInt: bigint;

    try {
      telegramIdBigInt = BigInt(String(telegramId));
    } catch {
      throw new UnauthorizedException(
        'Telegram ID noto‘g‘ri',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: telegramIdBigInt,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Foydalanuvchi topilmadi',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Foydalanuvchi bloklangan',
      );
    }

    request.user = user;

    return true;
  }
}
