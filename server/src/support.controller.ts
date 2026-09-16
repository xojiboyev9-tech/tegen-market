import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
  ) {}

  @Post('messages')
  @UseGuards(TelegramAuthGuard)
  async createMessage(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.supportService.createMessage(
      req.user.id,
      body,
    );
  }

  @Get('messages')
  @UseGuards(AdminAuthGuard)
  async getMessages() {
    return this.supportService.getMessages();
  }
}
