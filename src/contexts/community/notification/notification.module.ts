import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './domain/entities/push-token.entity';
import { Notification } from './domain/entities/notification.entity';
import { UserPreferences } from '@contexts/identity/user-management/domain/entities/user-preferences.entity';
import { PushService } from './application/services/push.service';
import { NotificationService } from './application/services/notification.service';
import { NotificationOrchestratorService } from './application/services/notification-orchestrator.service';
import { PushController } from './presentation/push.controller';
import { NotificationController } from './presentation/notification.controller';
import { FirebaseMessagingService } from './application/services/firebase-messaging.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken, Notification, UserPreferences])],
  controllers: [PushController, NotificationController],
  providers: [PushService, FirebaseMessagingService, NotificationService, NotificationOrchestratorService],
  exports: [PushService, FirebaseMessagingService, NotificationService, NotificationOrchestratorService],
})
export class NotificationModule {}
