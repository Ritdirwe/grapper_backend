import {
  Controller,
  Get,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ReportingService } from '../application/services/reporting.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@shared/types/role.type';
import { AnalyticsPeriod } from '../domain/value-objects/reporting-enums.vo';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('System Reporting & Analytics')
@ApiBearerAuth()
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get system audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportingService.getAuditLogs(page, limit);
  }

  @Get('analytics/user-growth')
  @ApiOperation({ summary: 'Get user growth analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiResponse({ status: 200 })
  async getUserGrowth(@Query('period') period: AnalyticsPeriod) {
    return this.reportingService.getUserGrowth(period || AnalyticsPeriod.MONTHLY);
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiResponse({ status: 200 })
  async getRevenueAnalytics(@Query('period') period: AnalyticsPeriod) {
    return this.reportingService.getRevenueAnalytics(period || AnalyticsPeriod.MONTHLY);
  }

  @Get('analytics/services')
  @ApiOperation({ summary: 'Get service performance analytics' })
  @ApiResponse({ status: 200 })
  async getServicePerformance() {
    return this.reportingService.getServicePerformance();
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=export.csv')
  @ApiOperation({ summary: 'Export system data to CSV' })
  @ApiQuery({ name: 'type', enum: ['users', 'bookings', 'services'] })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  async exportCsv(@Query('type') type: 'users' | 'bookings' | 'services') {
    return this.reportingService.exportData(type);
  }
}
