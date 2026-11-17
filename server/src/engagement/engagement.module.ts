import { Module } from '@nestjs/common';
import { EngagementController } from './engagement.controller';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({ controllers: [EngagementController, SupportController], providers: [SupportService], exports: [SupportService] })
export class EngagementModule {}
