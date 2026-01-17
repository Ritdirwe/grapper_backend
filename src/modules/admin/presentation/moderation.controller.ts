import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../application/services/admin.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/value-objects/user-role.vo';
import { CreateReportDto, ResolveReportDto, ReportResponseDto } from '../application/dto/admin.dto';
import { ReportStatus } from '../domain/value-objects/moderation-enums.vo';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly adminService: AdminService) {}

  // Reporting (Any authenticated user)
  @ApiBearerAuth()
  @Post('report')
  @ApiOperation({ summary: 'Report inappropriate content' })
  @ApiResponse({ status: 201, type: ReportResponseDto })
  async createReport(
    @CurrentUser() user: User,
    @Body() dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    return this.adminService.reportContent(user.id, dto);
  }

  // Report Management (Admin only)
  @ApiBearerAuth()
  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get list of reports (Admin only)' })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [ReportResponseDto] })
  async getReports(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getReports(status, page, limit);
  }

  @ApiBearerAuth()
  @Put('reports/:id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve a report (Admin only)' })
  @ApiResponse({ status: 200, type: ReportResponseDto })
  async resolveReport(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ): Promise<ReportResponseDto> {
    return this.adminService.resolveReport(admin.id, id, dto);
  }
}
