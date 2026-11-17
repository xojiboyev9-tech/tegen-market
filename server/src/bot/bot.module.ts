import { Module } from '@nestjs/common';
import { EngagementModule } from '../engagement/engagement.module';
import { OrdersModule } from '../orders/orders.module';
import { BotController } from './bot.controller';

@Module({ imports: [OrdersModule, EngagementModule], controllers: [BotController] })
export class BotModule {}
