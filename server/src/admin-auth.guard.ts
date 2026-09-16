import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const secret = process.env.ADMIN_SECRET;
    const provided = request.headers['x-admin-secret'];

    if (!secret || provided !== secret) {
      throw new UnauthorizedException('Admin access denied');
    }

    return true;
  }
}
