import { Module } from '@nestjs/common';
import { SocialModule } from './social/social.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { AdvertisementModule } from './advertisement/advertisement.module';

@Module({
  imports: [SocialModule, MessagingModule, NotificationModule, AdvertisementModule],
  exports: [SocialModule, MessagingModule, NotificationModule, AdvertisementModule],
})
export class CommunityModule {}
