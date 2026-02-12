import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './domain/entities/push-token.entity';
import { PushService } from './application/services/push.service';
import { PushController } from './presentation/push.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class NotificationModule {}
