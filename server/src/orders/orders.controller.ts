import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthUser, CurrentUser, Roles } from '../common/security';
import { parse } from '../common/util';
import { createOrderInput, OrdersService } from './orders.service';

const STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'] as const;

@Controller()
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('orders') create(@CurrentUser() u: AuthUser, @Body() b: unknown) { return this.svc.create(u, parse(createOrderInput, b)); }
  @Get('orders/my') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Get('orders/:id') one(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.svc.get(u, id); }
  @Post('orders/:id/cancel') cancel(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.svc.cancelByCustomer(u, id); }

  @Roles('SUPER_ADMIN', 'OPERATOR', 'COURIER') @Get('admin/orders')
  list(@CurrentUser() u: AuthUser, @Query('status') status?: string) {
    return this.svc.adminList(u, STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined);
  }

  @Roles('SUPER_ADMIN', 'OPERATOR', 'COURIER') @Patch('admin/orders/:id/status')
  status(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() b: unknown) {
    return this.svc.changeStatus(u, id, parse(z.object({ status: z.enum(STATUSES) }), b).status);
  }

  @Roles('SUPER_ADMIN', 'OPERATOR', 'CATEGORY_ADMIN') @Patch('admin/orders/:id/items/:itemId/weight')
  weight(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number, @Body() b: unknown) {
    return this.svc.setActualWeight(u, id, itemId, parse(z.object({ grams: z.number().int() }), b).grams);
  }

  @Roles('SUPER_ADMIN', 'OPERATOR') @Patch('admin/orders/:id/courier')
  courier(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() b: unknown) {
    return this.svc.assignCourier(u, id, parse(z.object({ courierId: z.number().int() }), b).courierId);
  }
}
