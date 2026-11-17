import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { AuthUser, CurrentUser, Roles } from '../common/security';
import { parse } from '../common/util';
import { SupportService } from './support.service';

/** Mijoz murojaatlari: bot orqali keladi (matn, rasm, ovoz, video), xodim panelda yoki botda javob beradi */
@Controller()
export class SupportController {
  constructor(private prisma: PrismaService, private svc: SupportService) {}

  @Get('support/messages')
  async mine(@CurrentUser() u: AuthUser) {
    const t = await this.prisma.supportThread.findUnique({
      where: { userId: u.id }, include: { messages: { orderBy: { id: 'desc' }, take: 50 } },
    });
    return (t?.messages ?? []).reverse().map((m) => ({ id: m.id, direction: m.direction, kind: m.kind, text: m.text, at: m.createdAt }));
  }

  @Roles('SUPER_ADMIN', 'OPERATOR') @Get('admin/support')
  threads() {
    return this.prisma.supportThread.findMany({
      include: { user: { select: { name: true, phone: true } }, messages: { orderBy: { id: 'desc' }, take: 30 } },
      orderBy: { lastMessageAt: 'desc' }, take: 100,
    });
  }

  @Roles('SUPER_ADMIN', 'OPERATOR') @Post('admin/support/:threadId/reply')
  async reply(@CurrentUser() u: AuthUser, @Param('threadId', ParseIntPipe) threadId: number, @Body() b: unknown) {
    const { text } = parse(z.object({ text: z.string().trim().min(1).max(2000) }), b);
    return this.svc.replyTo(u, threadId, text);
  }
}
