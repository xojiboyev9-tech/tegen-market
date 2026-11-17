import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommonModule } from './common/common.module';
import { PrismaService } from './common/prisma.service';
import { Public } from './common/security';
import { EngagementModule } from './engagement/engagement.module';
import { OrdersModule } from './orders/orders.module';

@Controller()
class HealthController {
  constructor(private prisma: PrismaService) {}

  /** Jarayon tirikmi (liveness) */
  @Public() @SkipThrottle() @Get('health') health() { return { ok: true }; }

  /** Baza bilan aloqa bormi (readiness): Cloud Run / monitoring uchun */
  @Public() @SkipThrottle() @Get('health/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: true };
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: false });
    }
  }
}

@Module({
  imports: [CommonModule, AuthModule, CatalogModule, OrdersModule, EngagementModule, AdminModule, BotModule],
  controllers: [HealthController],
})
export class AppModule {}
