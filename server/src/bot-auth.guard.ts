import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class BotAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const secret = process.env.BOT_SECRET;
    const provided = request.headers['x-bot-secret'];

    if (!secret || provided !== secret) {
      throw new UnauthorizedException('Bot access denied');
    }

    return true;
  }
}
