import { Controller, Post, Body, UseGuards, Delete, Query, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PushService } from '../application/services/push.service';
import { RegisterTokenDto, BroadcastDto, PushTokenResponseDto } from '../application/dto/notification.dto';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';

import { UserRole } from '@contexts/identity/domain/value-objects/user-role.vo';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.COMMUNITY_PUSH_SELF)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('tokens')
  @ApiOperation({ summary: 'List current user push tokens' })
  @ApiResponse({ status: 200, type: [PushTokenResponseDto] })
  async getTokens(@CurrentUser() user: AuthUser): Promise<PushTokenResponseDto[]> {
    return this.pushService.getTokens(user.id);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a device push token for the current user' })
  async registerToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterTokenDto,
  ) {
    return this.pushService.registerToken(user.id, dto);
  }

  @Delete('unregister')
  @ApiOperation({ summary: 'Unregister a device push token' })
  async unregisterToken(
    @CurrentUser() user: AuthUser,
    @Query('token') token: string,
  ) {
    return this.pushService.unregisterToken(user.id, token);
  }

  @Delete('tokens/:id')
  @ApiOperation({ summary: 'Remove a specific push token by id' })
  async removeToken(
    @CurrentUser() user: AuthUser,
    @Param('id') tokenId: string,
  ) {
    return this.pushService.removeToken(user.id, tokenId);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(PERMISSIONS.COMMUNITY_PUSH_BROADCAST)
  @ApiOperation({ summary: 'Broadcast a notification to all active devices (Admin only)' })
  async broadcast(@Body() dto: BroadcastDto) {
    return this.pushService.broadcast(dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to the current user' })
  async testNotification(@CurrentUser() user: AuthUser) {
    return this.pushService.sendToUser(
      user.id,
      'Test Notification',
      'This is a test notification from the Grapper backend.',
      { type: 'test' }
    );
  }
}
