import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { env } from './env';
import { PrismaService } from './prisma.service';

export type AuthUser = Prisma.UserGetPayload<{ include: { categories: true } }>;

export const Public = () => SetMetadata('isPublic', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) throw new UnauthorizedException();
    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(header.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    // Rol har so'rovda bazadan olinadi: admin rolni olib tashlasa, token darhol kuchini yo'qotadi
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { categories: true } });
    if (!user || user.isBlocked) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('Ruxsat yo\'q');
    return true;
  }
}

@Injectable()
export class BotSecretGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const h = String(ctx.switchToHttp().getRequest().headers['x-bot-secret'] ?? '');
    if (!safeEqual(h, env.botSecret)) throw new UnauthorizedException();
    return true;
  }
}

export const STAFF = ['SUPER_ADMIN', 'CATEGORY_ADMIN', 'OPERATOR', 'COURIER'];
export const isStaff = (u: { role: string }) => STAFF.includes(u.role);
export const canManageCategory = (u: AuthUser, categoryId: number) =>
  u.role === 'SUPER_ADMIN' || (u.role === 'CATEGORY_ADMIN' && u.categories.some((c) => c.categoryId === categoryId));
