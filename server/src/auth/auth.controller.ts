import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { parse } from '../common/util';
import { AuthUser, CurrentUser, Public } from '../common/security';
import { AuthService, publicUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('telegram')
  telegram(@Body() body: unknown) {
    const { initData } = parse(z.object({ initData: z.string().min(3).max(4096) }), body);
    return this.auth.loginWithInitData(initData);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return publicUser(user);
  }
}
