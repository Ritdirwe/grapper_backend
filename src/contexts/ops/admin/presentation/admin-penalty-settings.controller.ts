import { Controller, Get, HttpCode, HttpStatus, Put, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import { AdminPenaltySettingsService } from '../application/services/admin-penalty-settings.service';
import { AdminPenaltySettingsResponseDto, UpdateAdminPenaltySettingsDto } from '../application/dto/admin-penalty-settings.dto';

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@Controller('moderation/penalty-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPenaltySettingsController {
  constructor(private readonly adminPenaltySettingsService: AdminPenaltySettingsService) {}

  @Get()
  @Permissions(PERMISSIONS.OPS_ADMIN_PENALTY_SETTINGS_READ)
  @ApiOperation({ summary: 'Get admin penalty settings' })
  @ApiResponse({ status: 200, type: AdminPenaltySettingsResponseDto })
  async getSettings(): Promise<AdminPenaltySettingsResponseDto> {
    return this.adminPenaltySettingsService.getSettings();
  }

  @Put()
  @Permissions(PERMISSIONS.OPS_ADMIN_PENALTY_SETTINGS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update admin penalty settings' })
  @ApiResponse({ status: 200, type: AdminPenaltySettingsResponseDto })
  async updateSettings(
    @Body() dto: UpdateAdminPenaltySettingsDto,
  ): Promise<AdminPenaltySettingsResponseDto> {
    return this.adminPenaltySettingsService.updateSettings(dto);
  }
}
