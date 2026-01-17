import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from '../../domain/entities/conversation.entity';
import { ConversationParticipant } from '../../domain/entities/conversation-participant.entity';
import { Message } from '../../domain/entities/message.entity';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationResponseDto,
  AddParticipantDto,
} from '../dto/messaging.dto';
import { ConversationType } from '../../domain/value-objects/messaging-enums.vo';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async create(userId: string, dto: CreateConversationDto): Promise<ConversationResponseDto> {
    // Check if direct conversation already exists
    if (dto.participantIds.length === 1) {
      const otherUserId = dto.participantIds[0];
      const existing = await this.findDirectConversation(userId, otherUserId);
      if (existing) {
        return this.mapToResponseDto(existing, userId);
      }
    }

    // Determine conversation type
    const type = dto.participantIds.length === 1 
      ? ConversationType.DIRECT 
      : ConversationType.GROUP;

    // Create conversation
    const conversation = this.conversationRepository.create({
      type,
      name: dto.name,
    });

    await this.conversationRepository.save(conversation);

    // Add participants (including creator)
    const allParticipantIds = [...new Set([userId, ...dto.participantIds])];
    const participants = allParticipantIds.map(participantId =>
      this.participantRepository.create({
        conversationId: conversation.id,
        userId: participantId,
      }),
    );

    await this.participantRepository.save(participants);

    // Send initial message if provided
    if (dto.initialMessage) {
      const message = this.messageRepository.create({
        conversationId: conversation.id,
        senderId: userId,
        content: dto.initialMessage,
      });
      await this.messageRepository.save(message);
      conversation.updateLastMessage(message.id);
      await this.conversationRepository.save(conversation);
    }

    return this.findById(conversation.id, userId);
  }

  async findById(id: string, userId: string): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.user', 'participants.user.profile'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return this.mapToResponseDto(conversation, userId);
  }

  async findAll(userId: string, page = 1, limit = 20): Promise<ConversationResponseDto[]> {
    const participations = await this.participantRepository.find({
      where: { userId },
      relations: ['conversation', 'conversation.participants', 'conversation.participants.user', 'conversation.participants.user.profile'],
      order: { conversation: { lastMessageAt: 'DESC' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    return Promise.all(
      participations.map(p => this.mapToResponseDto(p.conversation, userId)),
    );
  }

  async update(id: string, userId: string, dto: UpdateConversationDto): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Only group conversations can be updated
    if (!conversation.isGroupConversation()) {
      throw new BadRequestException('Cannot update direct conversations');
    }

    if (dto.name !== undefined) conversation.name = dto.name;
    if (dto.groupAvatar !== undefined) conversation.groupAvatar = dto.groupAvatar;

    await this.conversationRepository.save(conversation);

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId: id, userId },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    // Remove user from conversation
    await this.participantRepository.remove(participant);
  }

  async addParticipant(id: string, userId: string, dto: AddParticipantDto): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if requester is participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Only group conversations can add participants
    if (!conversation.isGroupConversation()) {
      throw new BadRequestException('Cannot add participants to direct conversations');
    }

    // Check if user is already a participant
    const alreadyParticipant = conversation.participants.some(p => p.userId === dto.userId);
    if (alreadyParticipant) {
      throw new BadRequestException('User is already a participant');
    }

    const participant = this.participantRepository.create({
      conversationId: id,
      userId: dto.userId,
    });

    await this.participantRepository.save(participant);
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      return 0;
    }

    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.sender_id != :userId', { userId });

    if (participant.lastReadMessageId) {
      query.andWhere('message.created_at > (SELECT created_at FROM messages WHERE id = :lastReadMessageId)', {
        lastReadMessageId: participant.lastReadMessageId,
      });
    }

    return query.getCount();
  }

  private async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('participant.user_id IN (:...userIds)', { userIds: [userId1, userId2] })
      .groupBy('conversation.id')
      .having('COUNT(DISTINCT participant.user_id) = 2')
      .getMany();

    return conversations.length > 0 ? conversations[0] : null;
  }

  private async mapToResponseDto(conversation: Conversation, currentUserId: string): Promise<ConversationResponseDto> {
    let lastMessage = null;
    if (conversation.lastMessageId) {
      lastMessage = await this.messageRepository.findOne({
        where: { id: conversation.lastMessageId },
      });
    }

    const unreadCount = await this.getUnreadCount(conversation.id, currentUserId);

    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      groupAvatar: conversation.groupAvatar,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      participants: conversation.participants?.map(p => ({
        id: p.id,
        userId: p.userId,
        user: p.user ? {
          id: p.user.id,
          email: p.user.email,
          profile: p.user.profile ? {
            fullName: p.user.profile.fullName,
            displayName: p.user.profile.displayName,
            avatar: p.user.profile.avatarUrl,
          } : undefined,
        } : undefined,
      })),
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
      } : undefined,
      unreadCount,
    };
  }
}
