import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BannerService } from './banner.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  async findAll() {
    return this.bannerService.findAll();
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  async create(@Body() body: any) {
    return this.bannerService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.bannerService.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async remove(@Param('id') id: string) {
    return this.bannerService.remove(Number(id));
  }
}
