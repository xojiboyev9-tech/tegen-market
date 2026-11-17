import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, CurrentUser, Roles } from '../common/security';
import { StorageService } from '../common/storage.service';
import { normalizePhone, parse } from '../common/util';

const staffInput = z.object({
  phone: z.string().min(9).max(20),
  role: z.enum(['CATEGORY_ADMIN', 'OPERATOR', 'COURIER', 'SUPER_ADMIN']),
  categoryIds: z.array(z.number().int()).default([]),
});

@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService, private audit: AuditService, private storage: StorageService) {}

  // ----- rasm yuklash -----
  @Roles('SUPER_ADMIN', 'CATEGORY_ADMIN') @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl kerak');
    return { url: await this.storage.saveImage(file.buffer) };
  }

  // ----- xodimlar -----
  @Roles('SUPER_ADMIN', 'OPERATOR') @Get('staff')
  staff() {
    return this.prisma.user.findMany({
      where: { role: { not: 'CUSTOMER' } },
      select: { id: true, name: true, phone: true, role: true, categories: { select: { categoryId: true } } },
    });
  }

  /** Xodim avval botda /start bosib telefon raqamini yuborgan bo'lishi kerak */
  @Roles('SUPER_ADMIN') @Post('staff')
  async addStaff(@CurrentUser() actor: AuthUser, @Body() b: unknown) {
    const d = parse(staffInput, b);
    const phone = normalizePhone(d.phone);
    if (!phone) throw new BadRequestException("Telefon raqami noto'g'ri (+998...)");
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new BadRequestException('Bu raqam topilmadi. Xodim avval botda /start bosib raqamini yuborsin.');
    if (d.role === 'CATEGORY_ADMIN' && !d.categoryIds.length) throw new BadRequestException('Bo\'lim tanlang');
    await this.prisma.$transaction([
      this.prisma.staffCategory.deleteMany({ where: { userId: user.id } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: d.role,
          categories: d.role === 'CATEGORY_ADMIN' ? { create: d.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
        },
      }),
    ]);
    await this.audit.log(actor, 'staff.add', 'User', user.id, { role: d.role, categoryIds: d.categoryIds });
    return { ok: true };
  }

  @Roles('SUPER_ADMIN') @Delete('staff/:id')
  async removeStaff(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number) {
    if (id === actor.id) throw new BadRequestException('O\'zingizni o\'chira olmaysiz');
    await this.prisma.$transaction([
      this.prisma.staffCategory.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({ where: { id }, data: { role: 'CUSTOMER' } }),
    ]);
    await this.audit.log(actor, 'staff.remove', 'User', id);
    return { ok: true };
  }

  // ----- audit -----
  @Roles('SUPER_ADMIN') @Get('audit')
  auditLog(@Query('entity') entity?: string) {
    return this.prisma.auditLog.findMany({ where: entity ? { entity } : {}, orderBy: { id: 'desc' }, take: 300 });
  }

  // ----- statistika -----
  @Roles('SUPER_ADMIN', 'OPERATOR') @Get('stats')
  async stats() {
    // Server UTC da ishlaydi (Cloud Run), "bugun" esa Toshkent vaqti (UTC+5) bo'yicha hisoblanadi
    const TZ_MS = 5 * 3600_000;
    const local = new Date(Date.now() + TZ_MS);
    const startOfDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TZ_MS);
    const weekAgo = new Date(startOfDay.getTime() - 6 * 86400_000);
    const monthAgo = new Date(startOfDay.getTime() - 29 * 86400_000);
    const done = { status: 'COMPLETED' as const };

    const sum = async (from: Date) => {
      const rows = await this.prisma.order.findMany({ where: { ...done, createdAt: { gte: from } }, select: { totalFinal: true, totalEstimated: true } });
      return { orders: rows.length, revenue: rows.reduce((s, r) => s + (r.totalFinal ?? r.totalEstimated), 0) };
    };
    const [today, week, month] = await Promise.all([sum(startOfDay), sum(weekAgo), sum(monthAgo)]);

    const topRaw = await this.prisma.orderItem.groupBy({
      by: ['productId', 'name'], where: { order: done },
      _sum: { lineFinal: true, lineEstimated: true }, _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } }, take: 10,
    });
    const topProducts = topRaw.map((r) => ({ name: r.name, orders: r._count._all, revenue: r._sum.lineFinal ?? r._sum.lineEstimated ?? 0 }));

    const custRaw = await this.prisma.order.groupBy({
      by: ['customerId'], where: done, _count: { _all: true }, _sum: { totalFinal: true, totalEstimated: true },
      orderBy: { _count: { customerId: 'desc' } }, take: 10,
    });
    const users = await this.prisma.user.findMany({ where: { id: { in: custRaw.map((c) => c.customerId) } }, select: { id: true, name: true, phone: true } });
    const topCustomers = custRaw.map((c) => ({
      ...(users.find((u) => u.id === c.customerId) ?? { id: c.customerId, name: null, phone: null }),
      orders: c._count._all, spent: c._sum.totalFinal ?? c._sum.totalEstimated ?? 0,
    }));

    const daily = await this.prisma.$queryRaw<{ day: Date; orders: number; revenue: number }[]>(Prisma.sql`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Tashkent') AS day, COUNT(*)::int AS orders,
             COALESCE(SUM(COALESCE("totalFinal","totalEstimated")),0)::int AS revenue
      FROM "Order" WHERE status = 'COMPLETED' AND "createdAt" >= ${monthAgo}
      GROUP BY 1 ORDER BY 1`);

    return { today, week, month, topProducts, topCustomers, daily };
  }
}
