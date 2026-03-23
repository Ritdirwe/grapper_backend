import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { PreferencesService } from '../application/services/preferences.service';
import { UpdatePreferencesDto } from '../application/dto/preferences.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { User } from '../../domain/entities/user.entity';
import { UserPreferences } from '../domain/entities/user-preferences.entity';
import { PERMISSIONS } from '@common/authz/permissions.enum';

class NotificationSettingsDto {
  @ApiProperty({ required: false }) emailNotifications?: boolean;
  @ApiProperty({ required: false }) pushNotifications?: boolean;
  @ApiProperty({ required: false }) smsNotifications?: boolean;
  @ApiProperty({ required: false }) marketingEmails?: boolean;
}

class PrivacySettingsDto {
  @ApiProperty({ required: false }) showOnlineStatus?: boolean;
  @ApiProperty({ required: false }) showProfileToSearch?: boolean;
  @ApiProperty({ required: false }) allowMessagesFromAnyone?: boolean;
}

@ApiTags('User Preferences')
@ApiBearerAuth()
@Controller('preferences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @Permissions(PERMISSIONS.IDENTITY_PREFERENCES_READ_SELF)
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async getPreferences(@CurrentUser() user: User): Promise<UserPreferences> {
    return this.preferencesService.getPreferences(user.id);
  }

  @Put()
  @Permissions(PERMISSIONS.IDENTITY_PREFERENCES_UPDATE_SELF)
  @ApiOperation({ summary: 'Update all user preferences' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    return this.preferencesService.updatePreferences(user.id, dto);
  }

  @Put('notifications')
  @Permissions(PERMISSIONS.IDENTITY_PREFERENCES_UPDATE_NOTIFICATIONS_SELF)
  @ApiOperation({ summary: 'Update notification-specific settings' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async updateNotificationSettings(
    @CurrentUser() user: User,
    @Body() settings: NotificationSettingsDto,
  ): Promise<UserPreferences> {
    return this.preferencesService.updateNotificationSettings(user.id, settings);
  }

  @Put('privacy')
  @Permissions(PERMISSIONS.IDENTITY_PREFERENCES_UPDATE_PRIVACY_SELF)
  @ApiOperation({ summary: 'Update privacy-specific settings' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async updatePrivacySettings(
    @CurrentUser() user: User,
    @Body() settings: PrivacySettingsDto,
  ): Promise<UserPreferences> {
    return this.preferencesService.updatePrivacySettings(user.id, settings);
  }
}
