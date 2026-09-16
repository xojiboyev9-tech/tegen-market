import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('proposals')
export class ProposalController {
  constructor(
    private readonly proposalService: ProposalService,
  ) {}

  @Post()
  @UseGuards(TelegramAuthGuard)
  async create(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.proposalService.create(
      req.user.id,
      body,
    );
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  async findAll() {
    return this.proposalService.findAll();
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proposalService.update(
      Number(id),
      body,
    );
  }
}
