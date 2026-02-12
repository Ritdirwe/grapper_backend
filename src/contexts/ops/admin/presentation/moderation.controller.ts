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
import { Role } from '@shared/types/role.type';
import { CreateReportDto, ResolveReportDto, ReportResponseDto } from '../application/dto/admin.dto';
import { ReportStatus } from '../domain/value-objects/moderation-enums.vo';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly adminService: AdminService) {}

  @ApiBearerAuth()
  @Post('report')
  @ApiOperation({ summary: 'Report inappropriate content' })
  @ApiResponse({ status: 201, type: ReportResponseDto })
  async createReport(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    return this.adminService.reportContent(user.id, dto);
  }

  @ApiBearerAuth()
  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Resolve a report (Admin only)' })
  @ApiResponse({ status: 200, type: ReportResponseDto })
  async resolveReport(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ): Promise<ReportResponseDto> {
    return this.adminService.resolveReport(admin.id, id, dto);
  }
}
