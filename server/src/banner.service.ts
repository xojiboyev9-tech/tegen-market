import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.banner.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.banner.create({
      data: {
        title: data.title ?? null,
        imageUrl: data.imageUrl,
        subtitle: data.subtitle ?? null,
        buttonText: data.buttonText ?? null,
        targetType: data.targetType ?? null,
        targetId: data.targetId ?? null,
        linkUrl: data.linkUrl ?? null,
        isActive: data.isActive ?? true,
        order: Number(data.order ?? 0),
      },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.banner.update({
      where: { id },
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        subtitle: data.subtitle,
        buttonText: data.buttonText,
        targetType: data.targetType,
        targetId: data.targetId,
        linkUrl: data.linkUrl,
        isActive: data.isActive,
        order:
          data.order !== undefined
            ? Number(data.order)
            : undefined,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.banner.delete({
      where: { id },
    });
  }
}
