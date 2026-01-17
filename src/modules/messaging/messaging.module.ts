import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Conversation } from './domain/entities/conversation.entity';
import { Message } from './domain/entities/message.entity';
import { ConversationParticipant } from './domain/entities/conversation-participant.entity';

// Services
import { ConversationService } from './application/services/conversation.service';
import { MessageService } from './application/services/message.service';

// Controllers
import { ConversationController } from './presentation/conversation.controller';
import { MessageController } from './presentation/message.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, ConversationParticipant]),
  ],
  controllers: [ConversationController, MessageController],
  providers: [ConversationService, MessageService],
  exports: [ConversationService, MessageService],
})
export class MessagingModule {}
