import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(action: string, details?: string, userId?: number) {
    return this.prisma.auditLog.create({
      data: {
        action,
        details,
        userId: userId ?? null,
      },
    });
  }

  async getLogs(page = 1, limit = 20, userId?: number) {
    const skip = (page - 1) * limit;
    const where = userId ? { userId } : {};

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              firstName: true,
              lastName: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogById(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Audit log topilmadi');
    }

    return log;
  }
}
