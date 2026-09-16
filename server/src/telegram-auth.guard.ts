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

    const telegramIdString = String(telegramId);

    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: telegramIdString,
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
