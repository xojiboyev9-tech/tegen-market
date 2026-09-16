import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      users,
      products,
      orders,
      pendingOrders,
      completedOrders,
      nakopitelApplications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({
        where: { isActive: true },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.order.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.nakopitelApplication.count({
        where: { status: 'PENDING' },
      }),
    ]);

    const revenue = await this.prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    });

    return {
      users,
      products,
      orders,
      pendingOrders,
      completedOrders,
      nakopitelApplications,
      revenue: revenue._sum.total ?? 0,
    };
  }
}
