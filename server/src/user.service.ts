import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Telegram foydalanuvchisini topish, topilmasa yangi yaratish
  async findOrCreateUser(telegramUser: any) {
    const telegramId = BigInt(telegramUser.id);

    let user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          firstName: telegramUser.first_name || 'Foydalanuvchi',
          lastName: telegramUser.last_name,
          username: telegramUser.username,
        },
      });
    }

    return user;
  }

  async updateContact(id: number, phone?: string, language?: string) {
    return this.prisma.user.update({
      where: { id },
      data: { phone, language },
    });
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: ['OWNER', 'ADMIN', 'WORKER'],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setStaff(
    telegramId: string,
    role: string,
    department?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      throw new NotFoundException(
        'Telegram foydalanuvchisi topilmadi',
      );
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: { role, department },
    });
  }

  async removeStaff(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      throw new NotFoundException('Xodim topilmadi');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'USER',
        department: null,
      },
    });
  }

  // Barcha foydalanuvchilarni olish (rol va pagination filtri bilan)
  async getAllUsers(
    role?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Bitta foydalanuvchini ID bo'yicha olish
  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        'Foydalanuvchi topilmadi',
      );
    }

    return user;
  }

  // Foydalanuvchi rolini yangilash
  async updateRole(id: number, role: string) {
    await this.getUserById(id);

    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  // Foydalanuvchini o'chirish
  async deleteUser(id: number) {
    await this.getUserById(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
