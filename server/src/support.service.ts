import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(userId: number, data: any) {
    return this.prisma.message.create({
      data: {
        userId,
        content: data?.content ?? null,
      },
    });
  }

  async getMessages() {
    return this.prisma.message.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
            phoneNumber: true,
          },
        },
      },
    });
  }
}
