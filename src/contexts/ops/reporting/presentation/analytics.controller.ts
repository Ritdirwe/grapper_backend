import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ReportingService } from '../application/services/reporting.service';

@ApiTags('User Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('performance')
  @ApiOperation({ summary: 'Get user performance metrics' })
  async getPerformanceMetrics(@CurrentUser() user: AuthUser) {
    return this.reportingService.getPerformanceMetrics(user.id, user.role);
  }

  @Get('client-spending')
  @ApiOperation({ summary: 'Get client spending analytics' })
  async getClientSpending(@CurrentUser() user: AuthUser) {
    return this.reportingService.getClientSpending(user.id);
  }

  @Get('provider-earnings')
  @ApiOperation({ summary: 'Get provider earnings analytics' })
  async getProviderEarnings(@CurrentUser() user: AuthUser) {
    return this.reportingService.getProviderEarnings(user.id);
  }
}
