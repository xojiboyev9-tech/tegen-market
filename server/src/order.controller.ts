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
import { OrderService } from './order.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
  ) {}

  @Post()
  @UseGuards(TelegramAuthGuard)
  async create(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.orderService.create(
      req.user.id,
      body,
    );
  }

  @Get('my')
  @UseGuards(TelegramAuthGuard)
  async myOrders(@Req() req: any) {
    return this.orderService.findByUser(
      req.user.id,
    );
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  async findAll() {
    return this.orderService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.orderService.updateStatus(
      Number(id),
      body.status,
      body.approvedById,
    );
  }
}
