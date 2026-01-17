import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { PreferencesService } from '../application/services/preferences.service';
import { UpdatePreferencesDto } from '../application/dto/preferences.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { UserPreferences } from '../domain/entities/user-preferences.entity';

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
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async getPreferences(@CurrentUser() user: User): Promise<UserPreferences> {
    return this.preferencesService.getPreferences(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update all user preferences' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    return this.preferencesService.updatePreferences(user.id, dto);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update notification-specific settings' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async updateNotificationSettings(
    @CurrentUser() user: User,
    @Body() settings: NotificationSettingsDto,
  ): Promise<UserPreferences> {
    return this.preferencesService.updateNotificationSettings(user.id, settings);
  }

  @Put('privacy')
  @ApiOperation({ summary: 'Update privacy-specific settings' })
  @ApiResponse({ status: 200, type: UserPreferences })
  async updatePrivacySettings(
    @CurrentUser() user: User,
    @Body() settings: PrivacySettingsDto,
  ): Promise<UserPreferences> {
    return this.preferencesService.updatePrivacySettings(user.id, settings);
  }
}
