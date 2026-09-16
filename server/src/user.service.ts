import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateUser(telegramUser: any) {
    const telegramId = BigInt(telegramUser.id);

    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          firstName:
            telegramUser.first_name || 'Foydalanuvchi',
          lastName: telegramUser.last_name,
          username: telegramUser.username,
        },
      });
    }

    return user;
  }

  async syncUser(body: any) {
    if (body?.telegramId === undefined || body?.telegramId === null) {
      throw new NotFoundException('Telegram ID yuborilmadi');
    }

    const telegramId = BigInt(String(body.telegramId));

    const existing = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName:
            body.firstName ??
            body.first_name ??
            existing.firstName,
          lastName:
            body.lastName ??
            body.last_name ??
            existing.lastName,
          username:
            body.username ??
            existing.username,
          phone:
            body.phone ??
            existing.phone,
          phoneNumber:
            body.phoneNumber ??
            existing.phoneNumber,
          language:
            body.language ??
            existing.language,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        telegramId,
        firstName:
          body.firstName ??
          body.first_name ??
          'Foydalanuvchi',
        lastName:
          body.lastName ??
          body.last_name,
        username: body.username,
        phone: body.phone,
        phoneNumber: body.phoneNumber,
        language: body.language ?? 'uz',
      },
    });
  }

  async updateLanguage(
    id: number,
    language: string,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: { language },
    });
  }

  async updateContact(
    id: number,
    phone?: string,
    language?: string,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        phone,
        language,
      },
    });
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: ['OWNER', 'ADMIN', 'WORKER'],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async setStaff(
    telegramId: string,
    role: string,
    department?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: BigInt(telegramId),
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Telegram foydalanuvchisi topilmadi',
      );
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        role,
        department,
      },
    });
  }

  async removeStaff(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: BigInt(telegramId),
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Xodim topilmadi',
      );
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'USER',
        department: null,
      },
    });
  }

  async getAllUsers(
    role?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where = role
      ? { role }
      : {};

    const [users, total] =
      await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.user.count({
          where,
        }),
      ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(
          total / limit,
        ),
      },
    };
  }

  async getUserById(id: number) {
    const user =
      await this.prisma.user.findUnique({
        where: { id },
      });

    if (!user) {
      throw new NotFoundException(
        'Foydalanuvchi topilmadi',
      );
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.getUserById(id);
  }

  async updateRole(
    id: number,
    role: string,
  ) {
    await this.getUserById(id);

    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async deleteUser(id: number) {
    await this.getUserById(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }
      }
