import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, CurrentUser, Roles } from '../common/security';
import { parse } from '../common/util';
import { CatalogService, listQuery, productInput } from './catalog.service';

const categoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  emoji: z.string().max(8).nullish(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

@Controller()
export class CatalogController {
  constructor(private svc: CatalogService, private prisma: PrismaService, private audit: AuditService) {}

  // ----- mijozlar -----
  @Get('categories') categories() { return this.svc.categories(); }
  @Get('products') list(@Query() q: unknown) { return this.svc.list(parse(listQuery, q)); }
  @Get('products/:id') one(@Param('id', ParseIntPipe) id: number) { return this.svc.one(id); }

  // ----- kategoriyalar (faqat Super Admin) -----
  @Roles('SUPER_ADMIN', 'CATEGORY_ADMIN', 'OPERATOR')
  @Get('admin/categories')
  allCategories() { return this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }); }

  @Roles('SUPER_ADMIN') @Post('admin/categories')
  async createCategory(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    const c = await this.prisma.category.create({ data: parse(categoryInput, body) });
    await this.audit.log(u, 'category.create', 'Category', c.id);
    return c;
  }
  @Roles('SUPER_ADMIN') @Patch('admin/categories/:id')
  async updateCategory(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const c = await this.prisma.category.update({ where: { id }, data: parse(categoryInput.partial(), body) });
    await this.audit.log(u, 'category.update', 'Category', id);
    return c;
  }

  // ----- mahsulotlar (xodimlar) -----
  @Roles('SUPER_ADMIN', 'CATEGORY_ADMIN', 'OPERATOR')
  @Get('admin/products')
  adminList(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) {
    return this.svc.adminList(u, {
      status: q.status, q: q.q, proposals: q.proposals === '1',
      categoryId: q.categoryId ? Number(q.categoryId) : undefined,
    });
  }
  @Roles('SUPER_ADMIN', 'CATEGORY_ADMIN') @Post('admin/products')
  create(@CurrentUser() u: AuthUser, @Body() body: unknown) { return this.svc.create(u, parse(productInput, body)); }

  @Roles('SUPER_ADMIN', 'CATEGORY_ADMIN') @Patch('admin/products/:id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.svc.update(u, id, parse(productInput.partial(), body));
  }
  @Roles('SUPER_ADMIN', 'CATEGORY_ADMIN') @Delete('admin/products/:id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.svc.remove(u, id); }

  @Roles('SUPER_ADMIN') @Post('admin/products/:id/approve')
  approve(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.svc.approve(u, id); }

  @Roles('SUPER_ADMIN') @Post('admin/products/:id/reject')
  reject(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.svc.reject(u, id, parse(z.object({ reason: z.string().trim().min(2).max(300) }), body).reason);
  }
}
