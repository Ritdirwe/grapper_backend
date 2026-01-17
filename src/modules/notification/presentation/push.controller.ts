import { Controller, Post, Body, UseGuards, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { PushService } from '../application/services/push.service';
import { RegisterTokenDto, BroadcastDto } from '../application/dto/notification.dto';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

import { UserRole } from '../../identity/domain/value-objects/user-role.vo';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a device push token for the current user' })
  async registerToken(
    @CurrentUser() user: User,
    @Body() dto: RegisterTokenDto,
  ) {
    return this.pushService.registerToken(user.id, dto);
  }

  @Delete('unregister')
  @ApiOperation({ summary: 'Unregister a device push token' })
  async unregisterToken(
    @CurrentUser() user: User,
    @Query('token') token: string,
  ) {
    return this.pushService.unregisterToken(user.id, token);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Broadcast a notification to all active devices (Admin only)' })
  async broadcast(@Body() dto: BroadcastDto) {
    return this.pushService.broadcast(dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to the current user' })
  async testNotification(@CurrentUser() user: User) {
    return this.pushService.sendToUser(
      user.id,
      'Test Notification',
      'This is a test notification from the Gripper backend.',
      { type: 'test' }
    );
  }
}
