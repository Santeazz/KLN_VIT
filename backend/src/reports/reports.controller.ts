import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Reports')
@ApiBearerAuth('bearer')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('bonus')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @ApiOperation({ summary: 'Формирование отчета по премированию' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Отчетный месяц в формате YYYY-MM',
    example: '2026-05',
  })
  getBonusReport(@Query('month') month?: string) {
    return this.reportsService.getBonusReport(month);
  }
}
