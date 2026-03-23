import {
  Controller,
  Get,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ReportingService } from '../application/services/reporting.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AnalyticsPeriod } from '../domain/value-objects/reporting-enums.vo';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('System Reporting & Analytics')
@ApiBearerAuth()
@Controller('reporting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('audit-logs')
  @Permissions(PERMISSIONS.OPS_REPORTING_AUDIT_LOG_READ)
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
  @Permissions(PERMISSIONS.OPS_REPORTING_USER_GROWTH_READ)
  @ApiOperation({ summary: 'Get user growth analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiResponse({ status: 200 })
  async getUserGrowth(@Query('period') period: AnalyticsPeriod) {
    return this.reportingService.getUserGrowth(period || AnalyticsPeriod.MONTHLY);
  }

  @Get('analytics/revenue')
  @Permissions(PERMISSIONS.OPS_REPORTING_REVENUE_READ)
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiResponse({ status: 200 })
  async getRevenueAnalytics(@Query('period') period: AnalyticsPeriod) {
    return this.reportingService.getRevenueAnalytics(period || AnalyticsPeriod.MONTHLY);
  }

  @Get('analytics/services')
  @Permissions(PERMISSIONS.OPS_REPORTING_SERVICE_PERFORMANCE_READ)
  @ApiOperation({ summary: 'Get service performance analytics' })
  @ApiResponse({ status: 200 })
  async getServicePerformance() {
    return this.reportingService.getServicePerformance();
  }

  @Get('export/csv')
  @Permissions(PERMISSIONS.OPS_REPORTING_CSV_EXPORT)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=export.csv')
  @ApiOperation({ summary: 'Export system data to CSV' })
  @ApiQuery({ name: 'type', enum: ['users', 'bookings', 'services'] })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  async exportCsv(@Query('type') type: 'users' | 'bookings' | 'services') {
    return this.reportingService.exportData(type);
  }
}
