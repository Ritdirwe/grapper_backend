import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from '@contexts/identity/user-management/domain/entities/user-preferences.entity';
import { NotificationCategory, NotificationEventDto } from '../dto/notification-event.dto';
import { PushService } from './push.service';

@Injectable()
export class NotificationOrchestratorService {
  constructor(
    private readonly pushService: PushService,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
  ) {}

  async notifyUser(userId: string, event: NotificationEventDto): Promise<void> {
    if (!(await this.canNotify(userId, event.category))) {
      return;
    }

    await this.pushService.sendToUser(userId, event.title, event.body, {
      ...(event.data || {}),
      category: event.category,
      deepLink: event.deepLink,
    });
  }

  async notifyBookingConfirmed(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    return this.notifyUser(userId, { category: NotificationCategory.BOOKING, title, body, data });
  }

  async notifyBookingUpdate(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    return this.notifyBookingConfirmed(userId, title, body, data);
  }

  async notifyPayment(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    return this.notifyUser(userId, { category: NotificationCategory.PAYMENT, title, body, data });
  }

  async notifyMessage(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    return this.notifyUser(userId, { category: NotificationCategory.MESSAGE, title, body, data });
  }

  async notifyReview(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    return this.notifyUser(userId, { category: NotificationCategory.REVIEW, title, body, data });
  }

  async notifySystem(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    return this.notifyUser(userId, { category: NotificationCategory.SYSTEM, title, body, data });
  }

  private async canNotify(userId: string, category: NotificationCategory): Promise<boolean> {
    const preferences = await this.getOrCreatePreferences(userId);

    if (!preferences.pushNotifications) {
      return false;
    }

    switch (category) {
      case NotificationCategory.BOOKING:
        return preferences.bookingReminders;
      case NotificationCategory.MESSAGE:
        return preferences.messageNotifications;
      case NotificationCategory.REVIEW:
        return preferences.reviewNotifications;
      case NotificationCategory.PAYMENT:
        return preferences.paymentNotifications;
      case NotificationCategory.SYSTEM:
      default:
        return true;
    }
  }

  private async getOrCreatePreferences(userId: string): Promise<UserPreferences> {
    let preferences = await this.preferencesRepository.findOne({ where: { userId } });

    if (!preferences) {
      preferences = this.preferencesRepository.create({ userId });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }
}
