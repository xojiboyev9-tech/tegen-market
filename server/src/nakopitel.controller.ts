import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NakopitelService } from './nakopitel.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('nakopitel')
export class NakopitelController {
  constructor(
    private readonly nakopitelService: NakopitelService,
  ) {}

  @Get('my-balance')
  @UseGuards(TelegramAuthGuard)
  async myBalance(@Req() req: any) {
    return this.nakopitelService.getBalance(req.user.id);
  }

  @Get('my-transactions')
  @UseGuards(TelegramAuthGuard)
  async myTransactions(@Req() req: any) {
    return this.nakopitelService.getTransactions(req.user.id);
  }

  @Post('apply')
  @UseGuards(TelegramAuthGuard)
  async apply(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.nakopitelService.apply(
      req.user.id,
      body?.note,
    );
  }

  @Get('applications')
  @UseGuards(AdminAuthGuard)
  async applications() {
    return this.nakopitelService.getApplications();
  }

  @Patch('applications/:id')
  @UseGuards(AdminAuthGuard)
  async review(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.nakopitelService.review(
      Number(id),
      body.status,
      body.note,
      body.reviewedById,
    );
  }
}
