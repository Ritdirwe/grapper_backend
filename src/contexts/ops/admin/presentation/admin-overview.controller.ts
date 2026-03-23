import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AdminService } from '../application/services/admin.service';
import {
  AdminOverviewDto,
  RecountPostCommentsDto,
} from '../application/dto/admin.dto';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Admin Overview')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminOverviewController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @Permissions(PERMISSIONS.OPS_ADMIN_OVERVIEW_READ)
  @ApiOperation({ summary: 'Get admin overview statistics' })
  @ApiResponse({ status: 200, type: AdminOverviewDto })
  async getOverview(): Promise<AdminOverviewDto> {
    return this.adminService.getOverview() as any;
  }

  @Post('maintenance/recount')
  @Permissions(PERMISSIONS.OPS_ADMIN_MAINTENANCE_RECOUNT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recount denormalized counts (maintenance)' })
  @ApiResponse({ status: 200, type: RecountPostCommentsDto })
  async recountComments(): Promise<RecountPostCommentsDto> {
    return this.adminService.recountComments() as any;
  }
}
