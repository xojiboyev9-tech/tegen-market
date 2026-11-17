import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { env } from './env';
import { PrismaService } from './prisma.service';

type Extra = Record<string, unknown>;

@Injectable()
export class NotifyService {
  private log = new Logger('Notify');
  constructor(private prisma: PrismaService) {}

  private async call(method: string, body: Extra) {
    if (!env.botToken || env.botToken === 'dev') return;
    try {
      const r = await fetch(`https://api.telegram.org/bot${env.botToken}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) this.log.warn(`${method} -> ${r.status}`);
    } catch (e) {
      this.log.warn(`${method} xato: ${(e as Error).message}`);
    }
  }

  text(chatId: bigint | number | string, text: string, extra: Extra = {}) {
    return this.call('sendMessage', { chat_id: String(chatId), text, parse_mode: 'HTML', ...extra });
  }

  media(kind: string, chatId: bigint | number | string, fileId: string, caption?: string) {
    const map: Record<string, [string, string]> = {
      photo: ['sendPhoto', 'photo'],
      voice: ['sendVoice', 'voice'],
      video: ['sendVideo', 'video'],
    };
    const m = map[kind];
    if (!m) return Promise.resolve();
    return this.call(m[0], { chat_id: String(chatId), [m[1]]: fileId, caption, parse_mode: 'HTML' });
  }

  /** Berilgan rollardagi xodimlarga yuboradi */
  async toStaff(roles: Role[], text: string, extra: Extra = {}) {
    const staff = await this.prisma.user.findMany({ where: { role: { in: roles }, isBlocked: false } });
    await Promise.all(staff.map((s) => this.text(s.telegramId, text, extra)));
  }

  async mediaToStaff(roles: Role[], kind: string, fileId: string, caption?: string) {
    const staff = await this.prisma.user.findMany({ where: { role: { in: roles }, isBlocked: false } });
    await Promise.all(staff.map((s) => this.media(kind, s.telegramId, fileId, caption)));
  }
}
