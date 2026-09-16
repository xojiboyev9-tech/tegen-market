import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ProposalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, data: any) {
    return this.prisma.proposal.create({
      data: {
        userId,
        title: data.title ?? null,
        description: data.description ?? null,
        content: data.content ?? null,
        status: 'PENDING',
      },
    });
  }

  async findAll() {
    return this.prisma.proposal.findMany({
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
          },
        },
      },
    });
  }

  async update(id: number, data: any) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal topilmadi');
    }

    return this.prisma.proposal.update({
      where: { id },
      data: {
        title:
          data.title !== undefined
            ? data.title
            : undefined,
        description:
          data.description !== undefined
            ? data.description
            : undefined,
        content:
          data.content !== undefined
            ? data.content
            : undefined,
        adminNotes:
          data.adminNotes !== undefined
            ? data.adminNotes
            : undefined,
        status:
          data.status !== undefined
            ? data.status
            : undefined,
      },
    });
  }
}
