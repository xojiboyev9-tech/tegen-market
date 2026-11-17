import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService, publicUser } from '../auth/auth.service';
import { NotifyService } from '../common/notify.service';
import { fmtMoney } from '../common/pricing';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, BotSecretGuard, Public, STAFF } from '../common/security';
import { normalizePhone, orderCode, parse } from '../common/util';
import { SupportService } from '../engagement/support.service';
import { OrdersService } from '../orders/orders.service';

const tg = z.object({ telegramId: z.number().int().positive() });
const STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'] as const;

/** Faqat bot jarayoni (x-bot-secret bilan) chaqiradi. Brauzerdan ochiq emas. */
@Public()
@SkipThrottle()
@UseGuards(BotSecretGuard)
@Controller('bot')
export class BotController {
  constructor(
    private prisma: PrismaService, private auth: AuthService, private orders: OrdersService,
    private support: SupportService, private notify: NotifyService,
  ) {}

  private async user(telegramId: number) {
    const u = await this.prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) }, include: { categories: true } });
    if (!u || u.isBlocked) throw new BadRequestException('Foydalanuvchi topilmadi, /start bosing');
    return u;
  }

  @Post('start')
  async start(@Body() b: unknown) {
    const d = parse(tg.extend({ username: z.string().optional(), firstName: z.string().optional() }), b);
    const u = await this.auth.upsertTelegramUser({ id: d.telegramId, username: d.username, first_name: d.firstName });
    return { user: publicUser(u), needPhone: !u.phone, needName: !!u.phone && u.botState === 'name' };
  }

  @Post('phone')
  async phone(@Body() b: unknown) {
    const d = parse(tg.extend({ phone: z.string().max(30) }), b);
    const phone = normalizePhone(d.phone);
    if (!phone) return { ok: false, reason: 'Faqat O\'zbekiston raqamlari qabul qilinadi' };
    const taken = await this.prisma.user.findFirst({ where: { phone, NOT: { telegramId: BigInt(d.telegramId) } } });
    if (taken) return { ok: false, reason: 'Bu raqam boshqa akkauntga bog\'langan' };
    const u = await this.prisma.user.update({ where: { telegramId: BigInt(d.telegramId) }, data: { phone } });
    return { ok: true, needName: true, name: u.name };
  }

  @Post('name')
  async name(@Body() b: unknown) {
    const d = parse(tg.extend({ name: z.string().trim().min(2).max(60) }), b);
    await this.prisma.user.update({ where: { telegramId: BigInt(d.telegramId) }, data: { name: d.name } });
    return { ok: true };
  }

  @Get('user/:telegramId')
  async get(@Param('telegramId') id: string) {
    const u = await this.user(Number(id));
    return { ...publicUser(u), botState: u.botState, isStaff: STAFF.includes(u.role) };
  }

  @Post('state')
  async state(@Body() b: unknown) {
    const d = parse(tg.extend({ state: z.enum(['support', 'card', 'name']).nullable() }), b);
    await this.prisma.user.update({ where: { telegramId: BigInt(d.telegramId) }, data: { botState: d.state } });
    return { ok: true };
  }

  @Get('orders/:telegramId')
  async myOrders(@Param('telegramId') id: string) {
    const u = await this.user(Number(id));
    const rows = await this.prisma.order.findMany({ where: { customerId: u.id }, orderBy: { id: 'desc' }, take: 8 });
    return rows.map((o) => ({ code: orderCode(o.number), status: o.status, total: fmtMoney(o.totalFinal ?? o.totalEstimated) }));
  }

  @Post('support')
  async supportIn(@Body() b: unknown) {
    const d = parse(tg.extend({
      kind: z.enum(['text', 'photo', 'voice', 'video']), text: z.string().max(2000).optional(), fileId: z.string().max(300).optional(),
    }), b);
    const u = await this.user(d.telegramId);
    if (d.kind !== 'text' && !d.fileId) throw new BadRequestException();
    return { threadId: await this.support.inbound(u, d.kind, d.text, d.fileId) };
  }

  /** Xodim botda xabarga reply qilib javob beradi (xabardagi #T<id> bo'yicha) */
  @Post('support/reply')
  async supportReply(@Body() b: unknown) {
    const d = parse(tg.extend({ threadId: z.number().int(), text: z.string().trim().min(1).max(2000) }), b);
    const u = await this.user(d.telegramId);
    if (!['SUPER_ADMIN', 'OPERATOR'].includes(u.role)) throw new BadRequestException('Ruxsat yo\'q');
    return this.support.replyTo(u, d.threadId, d.text);
  }

  @Post('card')
  async card(@Body() b: unknown) {
    const d = parse(tg.extend({ number: z.string().max(32).optional(), fileId: z.string().max(300).optional() }), b);
    const u = await this.user(d.telegramId);
    if (!d.number && !d.fileId) throw new BadRequestException();
    const c = await this.prisma.discountCard.create({ data: { userId: u.id, number: d.number, photoFileId: d.fileId } });
    const head = `💳 Diskont karta tekshirish kutmoqda: ${u.name ?? '-'} ${u.phone ?? ''}${d.number ? `\nRaqam: ${d.number}` : ''}`;
    if (d.fileId) await this.notify.mediaToStaff(['SUPER_ADMIN', 'OPERATOR'], 'photo', d.fileId, head);
    else await this.notify.toStaff(['SUPER_ADMIN', 'OPERATOR'], head);
    return { id: c.id };
  }

  /** Inline tugma: xodim buyurtmani botdan qabul qiladi */
  @Post('orders/:id/status')
  async orderStatus(@Param('id') id: string, @Body() b: unknown) {
    const d = parse(tg.extend({ status: z.enum(STATUSES) }), b);
    const u = (await this.user(d.telegramId)) as AuthUser;
    return this.orders.changeStatus(u, Number(id), d.status as OrderStatus);
  }

  /** /admin buyrug'i: xodimga admin panel uchun qisqa muddatli token */
  @Post('admin-token')
  async adminToken(@Body() b: unknown) {
    const u = await this.user(parse(tg, b).telegramId);
    if (!STAFF.includes(u.role)) throw new BadRequestException('Siz xodim emassiz');
    return { token: await this.auth.sign(u, '30m'), role: u.role };
  }
}
