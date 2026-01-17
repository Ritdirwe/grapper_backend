import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../domain/entities/message.entity';
import { Conversation } from '../../domain/entities/conversation.entity';
import { ConversationParticipant } from '../../domain/entities/conversation-participant.entity';
import {
  SendMessageDto,
  UpdateMessageDto,
  MessageResponseDto,
  MarkAsReadDto,
} from '../dto/messaging.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepository: Repository<ConversationParticipant>,
  ) {}

  async send(conversationId: string, userId: string, dto: SendMessageDto): Promise<MessageResponseDto> {
    // Verify user is participant
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const message = this.messageRepository.create({
      conversationId,
      senderId: userId,
      content: dto.content,
      mediaUrls: dto.mediaUrls,
      replyToMessageId: dto.replyToMessageId,
    });

    await this.messageRepository.save(message);

    // Update conversation last message
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (conversation) {
      conversation.updateLastMessage(message.id);
      await this.conversationRepository.save(conversation);
    }

    return this.mapToResponseDto(message);
  }

  async findByConversation(conversationId: string, userId: string, page = 1, limit = 50): Promise<MessageResponseDto[]> {
    // Verify user is participant
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'profile')
      .leftJoinAndSelect('message.replyToMessage', 'replyToMessage')
      .where('message.conversation_id = :conversationId', { conversationId })
      .orderBy('message.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return messages.map(m => this.mapToResponseDto(m));
  }

  async update(id: string, userId: string, dto: UpdateMessageDto): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findOne({ where: { id } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Only allow editing within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      throw new ForbiddenException('Cannot edit messages older than 15 minutes');
    }

    message.content = dto.content;
    await this.messageRepository.save(message);

    return this.mapToResponseDto(message);
  }

  async delete(id: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete
    await this.messageRepository.softRemove(message);
  }

  async markAsRead(conversationId: string, userId: string, dto: MarkAsReadDto): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: dto.messageId, conversationId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Mark message as read
    message.markAsReadBy(userId);
    await this.messageRepository.save(message);

    // Update participant's last read
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (participant) {
      participant.updateLastRead(dto.messageId);
      await this.participantRepository.save(participant);
    }
  }

  async markAllAsRead(conversationId: string, userId: string): Promise<void> {
    // Get latest message in conversation
    const latestMessage = await this.messageRepository.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });

    if (!latestMessage) {
      return;
    }

    // Update participant's last read
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (participant) {
      participant.updateLastRead(latestMessage.id);
      await this.participantRepository.save(participant);
    }

    // Mark all messages as read by this user
    const messages = await this.messageRepository.find({
      where: { conversationId },
    });

    for (const message of messages) {
      if (!message.isReadBy(userId)) {
        message.markAsReadBy(userId);
      }
    }

    await this.messageRepository.save(messages);
  }

  private mapToResponseDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      mediaUrls: message.mediaUrls,
      replyToMessageId: message.replyToMessageId,
      readBy: message.readBy,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      deletedAt: message.deletedAt,
      sender: message.sender ? {
        id: message.sender.id,
        email: message.sender.email,
        profile: message.sender.profile ? {
          fullName: message.sender.profile.fullName,
          displayName: message.sender.profile.displayName,
          avatar: message.sender.profile.avatarUrl,
        } : undefined,
      } : undefined,
      replyToMessage: message.replyToMessage ? {
        id: message.replyToMessage.id,
        content: message.replyToMessage.content,
        senderId: message.replyToMessage.senderId,
      } : undefined,
    };
  }
}
