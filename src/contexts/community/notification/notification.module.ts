import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './domain/entities/push-token.entity';
import { PushService } from './application/services/push.service';
import { PushController } from './presentation/push.controller';
import { FirebaseMessagingService } from './application/services/firebase-messaging.service';
import { NotificationOrchestratorService } from './application/services/notification-orchestrator.service';
import { UserPreferences } from '@contexts/identity/user-management/domain/entities/user-preferences.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken, UserPreferences])],
  controllers: [PushController],
  providers: [PushService, FirebaseMessagingService, NotificationOrchestratorService],
  exports: [PushService, FirebaseMessagingService, NotificationOrchestratorService],
})
export class NotificationModule {}
