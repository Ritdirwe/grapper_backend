import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../domain/entities/notification.entity';
import { PushService } from './push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private pushService: PushService,
  ) {}

  async createAndDispatch(
    recipientId: string,
    type: string,
    title: string,
    body: string,
    data?: { entityType?: string; entityId?: string; actionUrl?: string; actorId?: string },
  ) {
    const notification = this.notificationRepository.create({
      recipientId,
      actorId: data?.actorId,
      type,
      title,
      body,
      entityType: data?.entityType,
      entityId: data?.entityId,
      actionUrl: data?.actionUrl,
      channel: 'in_app',
    });

    await this.notificationRepository.save(notification);

    // Also attempt push delivery
    try {
      await this.pushService.sendToUser(recipientId, title, body, {
        type,
        ...data,
      });
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);
    } catch (e) {
      this.logger.error(`Failed to dispatch push notification: ${e.message}`);
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipientId: userId },
    });
    if (notification) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { recipientId: userId, readAt: null },
      { readAt: new Date() },
    );
  }

  async listForUser(userId: string, limit = 20) {
    return this.notificationRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId: userId, readAt: null },
    });
  }
}
