import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditService } from './audit.service';
import { env } from './env';
import { NotifyService } from './notify.service';
import { PrismaService } from './prisma.service';
import { JwtGuard, RolesGuard } from './security';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [
    JwtModule.register({ global: true, secret: env.jwtSecret, signOptions: { expiresIn: '12h' } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  providers: [
    PrismaService,
    AuditService,
    NotifyService,
    StorageService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PrismaService, AuditService, NotifyService, StorageService],
})
export class CommonModule {}
