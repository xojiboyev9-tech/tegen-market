import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FulfillmentType, OrderStatus, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { AuditService } from '../common/audit.service';
import { NotifyService } from '../common/notify.service';
import { fmtMoney, fmtQty, lineTotal, validQuantity } from '../common/pricing';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, canManageCategory } from '../common/security';
import { esc, orderCode } from '../common/util';

export const createOrderInput = z.object({
  items: z.array(z.object({ productId: z.number().int(), quantity: z.number().int() })).min(1).max(50),
  fulfillment: z.enum(['PICKUP', 'DELIVERY']),
  address: z.string().trim().min(5).max(300).nullish(),
  note: z.string().trim().max(300).nullish(),
});

// Olib ketish asosiy yo'nalish; yetkazib berish qo'shimcha servis
const FLOW: Record<FulfillmentType, OrderStatus[]> = {
  PICKUP: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'],
  DELIVERY: ['NEW', 'ACCEPTED', 'PREPARING', 'DELIVERING', 'COMPLETED'],
};
const CANCELLABLE: OrderStatus[] = ['NEW', 'ACCEPTED', 'PREPARING'];

const full = { items: true, customer: true, events: { orderBy: { createdAt: 'asc' as const } } } satisfies Prisma.OrderInclude;
type FullOrder = Prisma.OrderGetPayload<{ include: typeof full }>;

export const orderView = (o: FullOrder) => ({
  id: o.id,
  code: orderCode(o.number),
  pickupCode: ['READY', 'COMPLETED'].includes(o.status) || o.fulfillment === 'PICKUP' ? o.pickupCode : undefined,
  status: o.status,
  fulfillment: o.fulfillment,
  phone: o.phone,
  address: o.address,
  note: o.note,
  totalEstimated: o.totalEstimated,
  totalFinal: o.totalFinal,
  courierId: o.courierId,
  createdAt: o.createdAt,
  customer: { id: o.customer.id, name: o.customer.name, phone: o.customer.phone },
  items: o.items.map((i) => ({
    id: i.id, productId: i.productId, name: i.name, type: i.type, unitPrice: i.unitPrice,
    quantity: i.quantity, actualQuantity: i.actualQuantity, lineEstimated: i.lineEstimated, lineFinal: i.lineFinal,
  })),
  events: o.events.map((e) => ({ status: e.status, at: e.createdAt })),
});

const CUSTOMER_TEXT: Record<string, (o: FullOrder) => string> = {
  ACCEPTED: (o) => `👍 Buyurtma <b>${orderCode(o.number)}</b> qabul qilindi.`,
  PREPARING: (o) => `👨‍🍳 Buyurtma <b>${orderCode(o.number)}</b> tayyorlanmoqda.`,
  READY: (o) =>
    `🎉 Buyurtmangiz tayyor!\n\nID: <b>${orderCode(o.number)}</b>\nKod: <b>${o.pickupCode}</b>\nJami: ${fmtMoney(o.totalFinal ?? o.totalEstimated)}\n\nOlganda ID, kod yoki telefon raqamingizni ayting.`,
  DELIVERING: (o) => `🚚 Buyurtma <b>${orderCode(o.number)}</b> yo'lga chiqdi.`,
  COMPLETED: (o) => `✅ Buyurtma <b>${orderCode(o.number)}</b> yakunlandi. Rahmat!\nJami: ${fmtMoney(o.totalFinal ?? o.totalEstimated)}`,
  CANCELLED: (o) => `❌ Buyurtma <b>${orderCode(o.number)}</b> bekor qilindi.`,
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notify: NotifyService) {}

  async create(user: AuthUser, input: z.infer<typeof createOrderInput>) {
    if (!user.phone) throw new BadRequestException('Avval botda telefon raqamingizni yuboring');
    if (input.fulfillment === 'DELIVERY' && !input.address) throw new BadRequestException('Manzilni kiriting');

    // bir xil mahsulot ikki marta kelsa qo'shamiz
    const qty = new Map<number, number>();
    for (const i of input.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.quantity);

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...qty.keys()] }, status: 'ACTIVE', category: { isActive: true } },
    });
    if (products.length !== qty.size) throw new BadRequestException('Ba\'zi mahsulotlar sotuvda yo\'q. Savatni yangilang.');

    // Narxlar FAQAT serverdagi bazadan olinadi, mijoz yuborgan narxga ishonilmaydi
    const lines = products.map((p) => {
      const q = qty.get(p.id)!;
      if (!validQuantity(p.type, q)) throw new BadRequestException(`"${p.name}" miqdori noto'g'ri`);
      return { p, q, total: lineTotal(p.type, p.price, q) };
    });
    const total = lines.reduce((s, l) => s + l.total, 0);

    const order = await this.prisma.order.create({
      data: {
        customerId: user.id,
        phone: user.phone,
        fulfillment: input.fulfillment,
        address: input.fulfillment === 'DELIVERY' ? input.address : null,
        note: input.note || null,
        pickupCode: String(randomInt(1000, 10000)),
        totalEstimated: total,
        items: {
          create: lines.map((l) => ({
            productId: l.p.id, name: l.p.name, type: l.p.type, unitPrice: l.p.price,
            quantity: l.q, lineEstimated: l.total,
          })),
        },
        events: { create: { status: 'NEW', actorId: user.id } },
      },
      include: full,
    });
    await this.audit.log(user, 'order.create', 'Order', order.id, { total });

    const code = orderCode(order.number);
    await this.notify.text(user.telegramId, `📨 Buyurtma <b>${code}</b> yuborildi. Operator tasdiqlashini kuting.\nJami: ${fmtMoney(total)}`);
    const itemsText = order.items
      .map((i) => `• ${esc(i.name)} — ${fmtQty(i.type, i.quantity)} = ${fmtMoney(i.lineEstimated)}`)
      .join('\n');
    await this.notify.toStaff(
      ['SUPER_ADMIN', 'OPERATOR'],
      `🆕 <b>Yangi buyurtma ${code}</b>\n👤 ${esc(user.name ?? '-')} ${esc(order.phone)}\n` +
        (order.fulfillment === 'PICKUP' ? '🏪 Olib ketadi' : `🚚 Yetkazish: ${esc(order.address ?? '')}`) +
        `\n\n${itemsText}\n\n<b>Jami: ${fmtMoney(total)}</b>` + (order.note ? `\n💬 ${esc(order.note)}` : ''),
      { reply_markup: { inline_keyboard: [[{ text: '✅ Qabul qilish', callback_data: `ord:ACCEPTED:${order.id}` }]] } },
    );
    return orderView(order);
  }

  async mine(user: AuthUser) {
    const rows = await this.prisma.order.findMany({
      where: { customerId: user.id }, include: full, orderBy: { id: 'desc' }, take: 50,
    });
    return rows.map(orderView);
  }

  async get(user: AuthUser, id: number) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: full });
    if (!o) throw new NotFoundException();
    const staff = ['SUPER_ADMIN', 'OPERATOR'].includes(user.role) || (user.role === 'COURIER' && o.courierId === user.id);
    if (o.customerId !== user.id && !staff) throw new NotFoundException();
    return orderView(o);
  }

  adminList(user: AuthUser, status?: OrderStatus) {
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(user.role === 'COURIER' ? { courierId: user.id } : {}),
    };
    return this.prisma.order.findMany({ where, include: full, orderBy: { id: 'desc' }, take: 200 }).then((r) => r.map(orderView));
  }

  async cancelByCustomer(user: AuthUser, id: number) {
    const o = await this.prisma.order.findFirst({ where: { id, customerId: user.id } });
    if (!o) throw new NotFoundException();
    if (o.status !== 'NEW') throw new BadRequestException('Qabul qilingan buyurtmani bekor qilib bo\'lmaydi. Operator bilan bog\'laning.');
    return this.changeStatus(user, id, 'CANCELLED', true);
  }

  async changeStatus(actor: AuthUser, id: number, status: OrderStatus, byCustomer = false) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: full });
    if (!o) throw new NotFoundException('Buyurtma topilmadi');

    if (!byCustomer) {
      const ops = ['SUPER_ADMIN', 'OPERATOR'].includes(actor.role);
      const courierOk = actor.role === 'COURIER' && o.courierId === actor.id && o.status === 'DELIVERING' && status === 'COMPLETED';
      if (!ops && !courierOk) throw new ForbiddenException();
    }
    const flow = FLOW[o.fulfillment];
    const next = flow[flow.indexOf(o.status) + 1];
    const okCancel = status === 'CANCELLED' && CANCELLABLE.includes(o.status);
    if (status !== next && !okCancel) throw new BadRequestException(`${o.status} dan ${status} ga o'tib bo'lmaydi`);

    const final = ['READY', 'DELIVERING', 'COMPLETED'].includes(status)
      ? o.items.reduce((s, i) => s + (i.lineFinal ?? i.lineEstimated), 0)
      : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Optimistik qulf: faqat holat hali o'qilgandagidek bo'lsa o'zgaradi.
      // Ikki xodim yoki qo'sh bosish bir buyurtmani ikki marta o'tkaza olmaydi.
      const moved = await tx.order.updateMany({
        where: { id, status: o.status },
        data: { status, ...(final !== undefined ? { totalFinal: final } : {}) },
      });
      if (moved.count !== 1) throw new ConflictException('Buyurtma holati allaqachon o\'zgargan. Sahifani yangilang.');
      await tx.orderEvent.create({ data: { orderId: id, status, actorId: actor.id } });
      if (status === 'COMPLETED') {
        for (const i of o.items) {
          await tx.product.update({ where: { id: i.productId }, data: { soldCount: { increment: 1 } } });
        }
      }
      return tx.order.findUniqueOrThrow({ where: { id }, include: full });
    });
    await this.audit.log(actor, `order.${status.toLowerCase()}`, 'Order', id);
    const text = CUSTOMER_TEXT[status]?.(updated);
    if (text) await this.notify.text(updated.customer.telegramId, text);
    return orderView(updated);
  }

  /** Yig'ishda tortilgan haqiqiy og'irlik: narx qayta hisoblanadi (0.512 kg x 45 000 = 23 040) */
  async setActualWeight(actor: AuthUser, orderId: number, itemId: number, grams: number) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId }, include: { product: true, order: true },
    });
    if (!item) throw new NotFoundException();
    if (item.type !== 'WEIGHT') throw new BadRequestException('Bu mahsulot og\'irlik bo\'yicha emas');
    if (!['ACCEPTED', 'PREPARING'].includes(item.order.status)) throw new BadRequestException('Hozir o\'zgartirib bo\'lmaydi');
    const allowed = ['SUPER_ADMIN', 'OPERATOR'].includes(actor.role) || canManageCategory(actor, item.product.categoryId);
    if (!allowed) throw new ForbiddenException();
    if (!Number.isInteger(grams) || grams < 10 || grams > item.quantity * 2) throw new BadRequestException('Og\'irlik noto\'g\'ri');

    const o = await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: itemId },
        data: { actualQuantity: grams, lineFinal: lineTotal('WEIGHT', item.unitPrice, grams) },
      });
      const items = await tx.orderItem.findMany({ where: { orderId } });
      const totalFinal = items.reduce((s, i) => s + (i.lineFinal ?? i.lineEstimated), 0);
      return tx.order.update({ where: { id: orderId }, data: { totalFinal }, include: full });
    });
    await this.audit.log(actor, 'order.weight', 'Order', orderId, { itemId, grams });
    return orderView(o);
  }

  async assignCourier(actor: AuthUser, orderId: number, courierId: number) {
    const courier = await this.prisma.user.findFirst({ where: { id: courierId, role: 'COURIER', isBlocked: false } });
    if (!courier) throw new BadRequestException('Kuryer topilmadi');
    const target = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!target) throw new NotFoundException('Buyurtma topilmadi');
    if (target.fulfillment !== 'DELIVERY') throw new BadRequestException('Bu buyurtma yetkazib berish emas');
    if (['COMPLETED', 'CANCELLED'].includes(target.status)) throw new BadRequestException('Yakunlangan buyurtmaga kuryer biriktirib bo\'lmaydi');
    const o = await this.prisma.order.update({ where: { id: orderId }, data: { courierId }, include: full });
    await this.audit.log(actor, 'order.courier', 'Order', orderId, { courierId });
    await this.notify.text(courier.telegramId, `🚚 Sizga yetkazish biriktirildi: <b>${orderCode(o.number)}</b>\n📍 ${esc(o.address ?? '')}\n📞 ${esc(o.phone)}`);
    return orderView(o);
  }
}
