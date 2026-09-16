import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category topilmadi');
    }

    return category;
  }

  async create(data: any) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon ?? null,
        sortOrder: Number(data.sortOrder ?? 0),
      },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.category.update({
      where: { id },
      data: {
        name:
          data.name !== undefined
            ? data.name
            : undefined,
        icon:
          data.icon !== undefined
            ? data.icon
            : undefined,
        sortOrder:
          data.sortOrder !== undefined
            ? Number(data.sortOrder)
            : undefined,
      },
    });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category topilmadi');
    }

    if (category.products.length > 0) {
      throw new Error(
        'Bu kategoriyada mahsulotlar mavjud. Avval mahsulotlarni boshqa kategoriyaga o‘tkazing.',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
