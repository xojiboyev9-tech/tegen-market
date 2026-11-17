import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, CurrentUser, Roles } from '../common/security';
import { parse } from '../common/util';

const bannerInput = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(160).nullish(),
  buttonText: z.string().trim().max(30).nullish(),
  imageUrl: z.string().url().max(500).nullish(),
  categoryId: z.number().int().nullish(),
  productId: z.number().int().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

@Controller()
export class EngagementController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ----- bannerlar -----
  @Get('banners')
  banners() {
    return this.prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] });
  }
  @Roles('SUPER_ADMIN') @Get('admin/banners')
  allBanners() { return this.prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] }); }

  @Roles('SUPER_ADMIN') @Post('admin/banners')
  async createBanner(@CurrentUser() u: AuthUser, @Body() b: unknown) {
    const r = await this.prisma.banner.create({ data: parse(bannerInput, b) });
    await this.audit.log(u, 'banner.create', 'Banner', r.id);
    return r;
  }
  @Roles('SUPER_ADMIN') @Patch('admin/banners/:id')
  async updateBanner(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() b: unknown) {
    const r = await this.prisma.banner.update({ where: { id }, data: parse(bannerInput.partial(), b) });
    await this.audit.log(u, 'banner.update', 'Banner', id);
    return r;
  }
  @Roles('SUPER_ADMIN') @Delete('admin/banners/:id')
  async deleteBanner(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.prisma.banner.delete({ where: { id } });
    await this.audit.log(u, 'banner.delete', 'Banner', id);
    return { ok: true };
  }

  // ----- sevimlilar -----
  @Get('favorites')
  async favorites(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId: u.id, product: { status: 'ACTIVE' } },
      include: { product: { select: { id: true, name: true, imageUrl: true, price: true, oldPrice: true, type: true, categoryId: true } } },
    });
    return rows.map((r) => r.product);
  }
  @Post('favorites/:productId')
  async fav(@CurrentUser() u: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId: u.id, productId } }, update: {}, create: { userId: u.id, productId },
    });
    return { ok: true };
  }
  @Delete('favorites/:productId')
  async unfav(@CurrentUser() u: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId: u.id, productId } });
    return { ok: true };
  }

  // ----- manzillar -----
  @Get('addresses') addresses(@CurrentUser() u: AuthUser) {
    return this.prisma.address.findMany({ where: { userId: u.id }, orderBy: { id: 'desc' }, take: 10 });
  }
  @Post('addresses')
  async addAddress(@CurrentUser() u: AuthUser, @Body() b: unknown) {
    const { text } = parse(z.object({ text: z.string().trim().min(5).max(300) }), b);
    const count = await this.prisma.address.count({ where: { userId: u.id } });
    if (count >= 10) await this.prisma.address.deleteMany({ where: { userId: u.id } });
    return this.prisma.address.create({ data: { userId: u.id, text } });
  }
  @Delete('addresses/:id')
  async delAddress(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.prisma.address.deleteMany({ where: { id, userId: u.id } });
    return { ok: true };
  }

  // ----- diskont karta (mijoz) -----
  @Get('cards') myCards(@CurrentUser() u: AuthUser) {
    return this.prisma.discountCard.findMany({ where: { userId: u.id }, orderBy: { id: 'desc' }, take: 5 });
  }
  @Post('cards')
  async addCard(@CurrentUser() u: AuthUser, @Body() b: unknown) {
    const { number } = parse(z.object({ number: z.string().trim().regex(/^[0-9A-Za-z\- ]{4,32}$/) }), b);
    const pending = await this.prisma.discountCard.count({ where: { userId: u.id, status: 'PENDING' } });
    if (pending >= 3) return this.prisma.discountCard.findFirst({ where: { userId: u.id, status: 'PENDING' } });
    return this.prisma.discountCard.create({ data: { userId: u.id, number } });
  }

  // ----- diskont karta (xodim tekshiradi, offline dasturga biriktiradi) -----
  @Roles('SUPER_ADMIN', 'OPERATOR') @Get('admin/cards')
  cards() {
    return this.prisma.discountCard.findMany({ include: { user: { select: { name: true, phone: true } } }, orderBy: { id: 'desc' }, take: 200 });
  }
  @Roles('SUPER_ADMIN', 'OPERATOR') @Patch('admin/cards/:id')
  async reviewCard(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() b: unknown) {
    const d = parse(z.object({ status: z.enum(['LINKED', 'REJECTED']), externalCode: z.string().max(64).nullish() }), b);
    const r = await this.prisma.discountCard.update({ where: { id }, data: d });
    await this.audit.log(u, `card.${d.status.toLowerCase()}`, 'DiscountCard', id);
    return r;
  }
}
