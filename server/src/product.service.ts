import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    return product;
  }

  async create(data: any) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        price: Number(data.price),
        categoryId: Number(data.categoryId),
        image: data.image ?? null,
        oldPrice:
          data.oldPrice !== undefined && data.oldPrice !== null
            ? Number(data.oldPrice)
            : null,
        description: data.description ?? null,
        department: data.department ?? null,
        isActive: data.isActive ?? true,
        status: data.status ?? 'APPROVED',
        authorId:
          data.authorId !== undefined && data.authorId !== null
            ? Number(data.authorId)
            : null,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: number, data: any) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name:
          data.name !== undefined
            ? data.name
            : undefined,

        price:
          data.price !== undefined
            ? Number(data.price)
            : undefined,

        categoryId:
          data.categoryId !== undefined
            ? Number(data.categoryId)
            : undefined,

        image:
          data.image !== undefined
            ? data.image
            : undefined,

        oldPrice:
          data.oldPrice !== undefined
            ? data.oldPrice === null
              ? null
              : Number(data.oldPrice)
            : undefined,

        description:
          data.description !== undefined
            ? data.description
            : undefined,

        department:
          data.department !== undefined
            ? data.department
            : undefined,

        isActive:
          data.isActive !== undefined
            ? Boolean(data.isActive)
            : undefined,

        status:
          data.status !== undefined
            ? data.status
            : undefined,
      },
      include: {
        category: true,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
