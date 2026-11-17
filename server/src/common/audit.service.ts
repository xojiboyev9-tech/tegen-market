import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Har bir muhim harakat yoziladi. Xato bo'lsa asosiy jarayonni to'xtatmaydi. */
  async log(
    actor: { id: number; role: string } | null,
    action: string,
    entity: string,
    entityId?: string | number,
    meta?: Prisma.InputJsonValue,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { actorId: actor?.id, actorRole: actor?.role, action, entity, entityId: entityId?.toString(), meta },
      });
    } catch (e) {
      console.error('audit xato', e);
    }
  }
}
