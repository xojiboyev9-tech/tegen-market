import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import config from './config';
import { PrismaService } from './prisma.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';

import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

import { UserController } from './user.controller';
import { UserService } from './user.service';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';

import { SupportController } from './support.controller';
import { SupportService } from './support.service';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

import { NakopitelController } from './nakopitel.controller';
import { NakopitelService } from './nakopitel.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
  ],

  controllers: [
    BannerController,
    CategoryController,
    UserController,
    ProductController,
    OrderController,
    ProposalController,
    SupportController,
    AuditController,
    StatsController,
    NakopitelController,
  ],

  providers: [
    PrismaService,

    BannerService,
    CategoryService,
    UserService,
    ProductService,
    OrderService,
    ProposalService,
    SupportService,
    AuditService,
    StatsService,
    NakopitelService,

    TelegramAuthGuard,
    AdminAuthGuard,
  ],
})
export class AppModule {}
