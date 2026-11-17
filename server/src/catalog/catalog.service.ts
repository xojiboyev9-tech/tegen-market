import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { z } from 'zod';
import { AuditService } from '../common/audit.service';
import { NotifyService } from '../common/notify.service';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, canManageCategory } from '../common/security';
import { esc } from '../common/util';

const publicSelect = {
  id: true, name: true, description: true, imageUrl: true, price: true, oldPrice: true,
  type: true, categoryId: true, isTrending: true,
} satisfies Prisma.ProductSelect;

export const listQuery = z.object({
  categoryId: z.coerce.number().int().optional(),
  q: z.string().trim().max(80).optional(),
  sale: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});

export const productInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullish(),
  imageUrl: z.string().url().max(500).nullish(),
  price: z.number().int().min(100).max(100_000_000),
  oldPrice: z.number().int().min(100).max(100_000_000).nullish(),
  type: z.enum(['PIECE', 'WEIGHT']),
  categoryId: z.number().int(),
  barcode: z.string().max(64).nullish(),
  externalId: z.string().max(64).nullish(),
  isTrending: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'HIDDEN']).optional(), // faqat Super Admin
});

const EDITABLE = ['name', 'description', 'imageUrl', 'price', 'oldPrice', 'type', 'categoryId', 'barcode', 'isTrending'] as const;

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notify: NotifyService) {}

  // ---------- mijozlar uchun ----------
  categories() {
    return this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  }

  async list(q: z.infer<typeof listQuery>) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      category: { isActive: true },
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
      ...(q.sale ? { oldPrice: { not: null } } : {}),
      ...(q.trending ? { isTrending: true } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: publicSelect,
        orderBy: q.trending ? [{ soldCount: 'desc' }, { id: 'desc' }] : [{ id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page };
  }

  async one(id: number) {
    const p = await this.prisma.product.findFirst({ where: { id, status: 'ACTIVE' }, select: publicSelect });
    if (!p) throw new NotFoundException('Mahsulot topilmadi');
    return p;
  }

  // ---------- xodimlar uchun ----------
  async adminList(user: AuthUser, q: { status?: string; categoryId?: number; q?: string; proposals?: boolean }) {
    const scope: Prisma.ProductWhereInput =
      user.role === 'CATEGORY_ADMIN' ? { categoryId: { in: user.categories.map((c) => c.categoryId) } } : {};
    return this.prisma.product.findMany({
      where: {
        ...scope,
        ...(q.proposals ? { OR: [{ status: 'PENDING' }, { hasPending: true }] } : {}),
        ...(q.status ? { status: q.status as ProductStatus } : {}),
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
        ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
      },
      include: { category: true },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async create(user: AuthUser, input: z.infer<typeof productInput>) {
    if (!canManageCategory(user, input.categoryId)) throw new ForbiddenException('Bu bo\'lim sizniki emas');
    const superAdmin = user.role === 'SUPER_ADMIN';
    const { status, ...rest } = input;
    const p = await this.prisma.product.create({
      data: {
        ...rest,
        isTrending: superAdmin ? input.isTrending ?? false : false,
        status: superAdmin ? status ?? 'ACTIVE' : 'PENDING', // xodim qo'shsa tasdiq kutadi
        createdById: user.id,
      },
    });
    await this.audit.log(user, superAdmin ? 'product.create' : 'product.propose', 'Product', p.id, { name: p.name });
    if (!superAdmin) await this.notifyApprovers(`🆕 Yangi mahsulot tasdiq kutmoqda: <b>${esc(p.name)}</b>`);
    return p;
  }

  async update(user: AuthUser, id: number, input: Partial<z.infer<typeof productInput>>) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    if (!canManageCategory(user, p.categoryId)) throw new ForbiddenException();
    if (input.categoryId && !canManageCategory(user, input.categoryId)) throw new ForbiddenException();

    const changes: Record<string, unknown> = {};
    for (const k of EDITABLE) if (input[k] !== undefined) changes[k] = input[k];

    if (user.role === 'SUPER_ADMIN') {
      const data: Prisma.ProductUncheckedUpdateInput = {
        ...(changes as Prisma.ProductUncheckedUpdateInput), hasPending: false, pending: Prisma.DbNull,
        ...(input.status ? { status: input.status } : {}),
      };
      const u = await this.prisma.product.update({ where: { id }, data });
      await this.audit.log(user, 'product.update', 'Product', id, changes as Prisma.InputJsonValue);
      return u;
    }
    // Kategoriya admini: isTrending va status'ni o'zgartira olmaydi
    delete changes.isTrending;
    if (p.status === 'ACTIVE') {
      // faol mahsulot sotuvda qoladi, o'zgarish tasdiq kutadi
      const u = await this.prisma.product.update({
        where: { id },
        data: { hasPending: true, pending: { ...((p.pending as object) ?? {}), ...changes } as Prisma.InputJsonValue },
      });
      await this.audit.log(user, 'product.propose_change', 'Product', id, changes as Prisma.InputJsonValue);
      await this.notifyApprovers(`✏️ Mahsulot o'zgarishi tasdiq kutmoqda: <b>${esc(p.name)}</b>`);
      return u;
    }
    // hali tasdiqlanmagan yoki rad etilgan: to'g'ridan-to'g'ri tahrir, qayta tasdiqqa ketadi
    const u = await this.prisma.product.update({ where: { id }, data: { ...changes, status: 'PENDING', rejectReason: null } });
    await this.audit.log(user, 'product.resubmit', 'Product', id);
    await this.notifyApprovers(`🆕 Mahsulot qayta tasdiq kutmoqda: <b>${esc(u.name)}</b>`);
    return u;
  }

  async approve(user: AuthUser, id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.status !== 'PENDING' && !p.hasPending) throw new BadRequestException('Tasdiq kutilmayapti');
    const patch = p.hasPending ? (p.pending as Prisma.ProductUncheckedUpdateInput) : {};
    const u = await this.prisma.product.update({
      where: { id },
      data: { ...patch, status: 'ACTIVE', hasPending: false, pending: Prisma.DbNull, rejectReason: null },
    });
    await this.audit.log(user, 'product.approve', 'Product', id);
    await this.tellCreator(p.createdById, `✅ Mahsulotingiz tasdiqlandi: <b>${esc(u.name)}</b>`);
    return u;
  }

  async reject(user: AuthUser, id: number, reason: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.status !== 'PENDING' && !p.hasPending) throw new BadRequestException('Tasdiq kutilmayapti');
    const u = await this.prisma.product.update({
      where: { id },
      data: p.hasPending
        ? { hasPending: false, pending: Prisma.DbNull, rejectReason: reason } // faol versiya saqlanadi
        : { status: 'REJECTED', rejectReason: reason },
    });
    await this.audit.log(user, 'product.reject', 'Product', id, { reason });
    await this.tellCreator(p.createdById, `❌ Mahsulot rad etildi: <b>${esc(p.name)}</b>\nSabab: ${esc(reason)}`);
    return u;
  }

  async remove(user: AuthUser, id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException();
    if (!canManageCategory(user, product.categoryId)) throw new ForbiddenException('Bu bo\'lim sizniki emas');
    const u = await this.prisma.product.update({ where: { id }, data: { status: 'HIDDEN' } });
    await this.audit.log(user, 'product.hide', 'Product', id);
    return u;
  }

  private notifyApprovers(text: string) {
    return this.notify.toStaff(['SUPER_ADMIN'], text);
  }
  private async tellCreator(userId: number | null, text: string) {
    if (!userId) return;
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (u) await this.notify.text(u.telegramId, text);
  }
}
