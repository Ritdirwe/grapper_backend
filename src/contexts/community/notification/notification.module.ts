import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './domain/entities/push-token.entity';
import { PushService } from './application/services/push.service';
import { PushController } from './presentation/push.controller';
import { FirebaseMessagingService } from './application/services/firebase-messaging.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [PushController],
  providers: [PushService, FirebaseMessagingService],
  exports: [PushService, FirebaseMessagingService],
})
export class NotificationModule {}
