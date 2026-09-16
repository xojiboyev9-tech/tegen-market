import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class NakopitelService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        points: true,
        totalCashback: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return {
      userId: user.id,
      balance: user.points,
      points: user.points,
      totalCashback: user.totalCashback,
    };
  }

  async getTransactions(userId: number) {
    return this.prisma.cashbackTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async apply(userId: number, note?: string) {
    const existing =
      await this.prisma.nakopitelApplication.findFirst({
        where: {
          userId,
          status: 'PENDING',
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Sizda ko‘rib chiqilayotgan ariza mavjud',
      );
    }

    return this.prisma.nakopitelApplication.create({
      data: {
        userId,
        status: 'PENDING',
        note: note ?? null,
      },
    });
  }

  async getApplications() {
    return this.prisma.nakopitelApplication.findMany({
      orderBy: { createdAt: 'desc' },
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
        reviewedBy: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async review(
    id: number,
    status: string,
    note?: string,
    reviewedById?: number,
  ) {
    const allowed = ['APPROVED', 'REJECTED'];

    if (!allowed.includes(status)) {
      throw new BadRequestException(
        'Status APPROVED yoki REJECTED bo‘lishi kerak',
      );
    }

    const application =
      await this.prisma.nakopitelApplication.findUnique({
        where: { id },
      });

    if (!application) {
      throw new NotFoundException('Nakopitel arizasi topilmadi');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(
        'Bu ariza allaqachon ko‘rib chiqilgan',
      );
    }

    return this.prisma.nakopitelApplication.update({
      where: { id },
      data: {
        status,
        note: note ?? application.note,
        reviewedById: reviewedById ?? null,
      },
    });
  }
  }
