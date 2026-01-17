import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from '../application/services/admin.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole, UserStatus } from '../../identity/domain/value-objects/user-role.vo';
import { SystemStatsDto } from '../application/dto/admin.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get global system statistics for admin dashboard' })
  @ApiResponse({ status: 200, type: SystemStatsDto })
  async getStats(): Promise<SystemStatsDto> {
    return this.adminService.getDashboardStats();
  }

  // Service Management
  @Put('services/:id/:action')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Manage service status (activate, deactivate, delete)' })
  @ApiResponse({ status: 204 })
  async manageService(
    @Param('id') id: string,
    @Param('action') action: 'activate' | 'deactivate' | 'delete',
  ) {
    return this.adminService.manageService(id, action);
  }

  // Global Content Deletion
  @Delete('content/:type/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete global content by type and ID' })
  @ApiResponse({ status: 204 })
  async deleteContent(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteContent(type, id);
  }
}
