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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const telegramId =
      request.headers['x-telegram-id'] ||
      request.headers['telegram-id'];

    if (!telegramId) {
      throw new UnauthorizedException(
        'Telegram foydalanuvchisi aniqlanmadi',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: BigInt(String(telegramId)),
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Foydalanuvchi topilmadi',
      );
    }

    request.user = user;

    return true;
  }
}
