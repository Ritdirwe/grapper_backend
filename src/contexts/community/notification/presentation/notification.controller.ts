import { Controller, Get, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { NotificationService } from '../application/services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  async list(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return this.notificationService.listForUser(user.id, limit);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    await this.notificationService.markAllAsRead(user.id);
    return { message: 'All notifications marked as read' };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notificationService.countUnread(user.id) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notificationService.markAsRead(id, user.id);
    return { message: 'Notification marked as read' };
  }
}
