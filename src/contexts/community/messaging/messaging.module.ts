import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './domain/entities/conversation.entity';
import { Message } from './domain/entities/message.entity';
import { ConversationParticipant } from './domain/entities/conversation-participant.entity';
import { ConversationService } from './application/services/conversation.service';
import { MessageService } from './application/services/message.service';
import { ConversationController } from './presentation/conversation.controller';
import { MessageController } from './presentation/message.controller';
import { NotificationModule } from '@contexts/community/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, ConversationParticipant]), NotificationModule],
  controllers: [ConversationController, MessageController],
  providers: [ConversationService, MessageService],
  exports: [ConversationService, MessageService],
})
export class MessagingModule {}
