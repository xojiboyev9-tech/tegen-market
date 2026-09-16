import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('audit')
@UseGuards(AdminAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(@Req() req: any) {
    return this.auditService.findAll();
  }
}
