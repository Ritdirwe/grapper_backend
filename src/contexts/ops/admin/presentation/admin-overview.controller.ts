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
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@shared/types/role.type';
import { AdminService } from '../application/services/admin.service';
import {
  AdminOverviewDto,
  RecountPostCommentsDto,
} from '../application/dto/admin.dto';

@ApiTags('Admin Overview')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOverviewController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get admin overview statistics' })
  @ApiResponse({ status: 200, type: AdminOverviewDto })
  async getOverview(): Promise<AdminOverviewDto> {
    return this.adminService.getOverview() as any;
  }

  @Post('maintenance/recount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recount denormalized counts (maintenance)' })
  @ApiResponse({ status: 200, type: RecountPostCommentsDto })
  async recountComments(): Promise<RecountPostCommentsDto> {
    return this.adminService.recountComments() as any;
  }
}
