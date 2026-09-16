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
import { UserService } from './user.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('sync')
  async sync(@Body() body: any) {
    return this.userService.syncUser(body);
  }

  @Get('me')
  @UseGuards(TelegramAuthGuard)
  async me(@Req() req: any) {
    return req.user;
  }

  @Patch('language')
  @UseGuards(TelegramAuthGuard)
  async updateLanguage(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.userService.updateLanguage(
      req.user.id,
      body.language,
    );
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(Number(id));
  }

  @Patch(':id/role')
  @UseGuards(AdminAuthGuard)
  async updateRole(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.userService.updateRole(
      Number(id),
      body.role,
    );
  }
}
