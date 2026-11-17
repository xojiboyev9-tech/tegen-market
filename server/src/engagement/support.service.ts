import { Injectable } from '@nestjs/common';
import { AuditService } from '../common/audit.service';
import { NotifyService } from '../common/notify.service';
import { PrismaService } from '../common/prisma.service';
import { esc } from '../common/util';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService, private notify: NotifyService, private audit: AuditService) {}

  async inbound(user: { id: number; name: string | null; phone: string | null }, kind: string, text?: string, fileId?: string) {
    const thread = await this.prisma.supportThread.upsert({
      where: { userId: user.id }, update: { isOpen: true, lastMessageAt: new Date() }, create: { userId: user.id },
    });
    await this.prisma.supportMessage.create({ data: { threadId: thread.id, direction: 'IN', kind, text, fileId } });
    // Xodimga ketadigan xabarda #T<id> bor: shu xabarga "reply" qilib javob beriladi
    const head = `💬 <b>#T${thread.id}</b> ${esc(user.name ?? '-')} ${esc(user.phone ?? '')}`;
    if (kind === 'text') await this.notify.toStaff(['SUPER_ADMIN', 'OPERATOR'], `${head}\n${esc(text ?? '')}`);
    else await this.notify.mediaToStaff(['SUPER_ADMIN', 'OPERATOR'], kind, fileId!, `${head}\n${esc(text ?? '')}`);
    return thread.id;
  }

  async replyTo(actor: { id: number; role: string }, threadId: number, text: string) {
    const t = await this.prisma.supportThread.findUnique({ where: { id: threadId }, include: { user: true } });
    if (!t) return { ok: false };
    await this.prisma.supportMessage.create({ data: { threadId, direction: 'OUT', kind: 'text', text } });
    await this.prisma.supportThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
    await this.notify.text(t.user.telegramId, `💬 <b>Tegen</b>:\n${esc(text)}`);
    await this.audit.log(actor, 'support.reply', 'SupportThread', threadId);
    return { ok: true };
  }
}
