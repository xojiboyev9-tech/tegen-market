import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, data: any) {
    const items = Array.isArray(data?.items)
      ? data.items
      : [];

    if (!items.length) {
      throw new BadRequestException(
        'Buyurtmada mahsulotlar mavjud emas',
      );
    }

    const productIds = items.map(
      (item: any) => Number(item.productId),
    );

    const products =
      await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
      });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Ayrim mahsulotlar mavjud emas yoki faol emas',
      );
    }

    const orderItems: Array<{
      productId: number;
      quantity: number;
      price: number;
    }> = items.map((item: any) => {
      const product = products.find(
        (p) => p.id === Number(item.productId),
      );

      if (!product) {
        throw new BadRequestException(
          'Mahsulot topilmadi',
        );
      }

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new BadRequestException(
          'Mahsulot miqdori noto‘g‘ri',
        );
      }

      return {
        productId: product.id,
        quantity,
        price: product.price,
      };
    });

    const total = orderItems.reduce(
      (sum: number, item) =>
        sum + item.price * item.quantity,
      0,
    );

    return this.prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        total,
        totalAmount: total,
        address: data?.address ?? null,
        phone: data?.phone ?? null,
        notes: data?.notes ?? null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByUser(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        approvedBy: {
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

  async findAll() {
    return this.prisma.order.findMany({
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
        items: {
          include: {
            product: true,
          },
        },
        approvedBy: {
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

  async updateStatus(
    id: number,
    status: string,
    approvedById?: number,
  ) {
    const allowedStatuses = [
      'PENDING',
      'ACCEPTED',
      'DELIVERING',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Noto‘g‘ri order status: ${status}`,
      );
    }

    const order =
      await this.prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Buyurtma topilmadi',
      );
    }

    if (
      status === 'COMPLETED' &&
      !order.cashbackAwarded
    ) {
      const cashback = Number(
        (order.total * 0.02).toFixed(2),
      );

      if (cashback > 0) {
        await this.prisma.$transaction(
          async (tx) => {
            await tx.order.update({
              where: { id },
              data: {
                status,
                approvedById:
                  approvedById ??
                  order.approvedById,
                cashbackAwarded: true,
              },
            });

            await tx.user.update({
              where: {
                id: order.userId,
              },
              data: {
                points: {
                  increment:
                    Math.floor(cashback),
                },
                totalCashback: {
                  increment: cashback,
                },
              },
            });

            await tx.cashbackTransaction.create({
              data: {
                userId: order.userId,
                amount: cashback,
                type: 'EARNED',
                description:
                  `Buyurtma #${order.id} uchun 2% cashback`,
              },
            });
          },
        );
      } else {
        await this.prisma.order.update({
          where: { id },
          data: {
            status,
            approvedById:
              approvedById ??
              order.approvedById,
            cashbackAwarded: true,
          },
        });
      }
    } else {
      await this.prisma.order.update({
        where: { id },
        data: {
          status,
          approvedById:
            approvedById ??
            order.approvedById,
        },
      });
    }

    return this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        approvedBy: true,
      },
    });
  }
          }
