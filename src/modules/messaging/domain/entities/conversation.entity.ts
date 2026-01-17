import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { ConversationType } from '../value-objects/messaging-enums.vo';
import { Message } from './message.entity';
import { ConversationParticipant } from './conversation-participant.entity';

@Entity('conversations')
@Index(['type'])
@Index(['lastMessageAt'])
export class Conversation extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Column({ name: 'last_message_id', nullable: true })
  lastMessageId?: string;

  @Column({ name: 'last_message_at', nullable: true })
  lastMessageAt?: Date;

  @Column({ nullable: true })
  name?: string; // For group conversations

  @Column({ name: 'group_avatar', nullable: true })
  groupAvatar?: string;

  // Relations
  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(() => ConversationParticipant, (participant) => participant.conversation)
  participants: ConversationParticipant[];

  // Helper methods
  updateLastMessage(messageId: string): void {
    this.lastMessageId = messageId;
    this.lastMessageAt = new Date();
  }

  isDirectConversation(): boolean {
    return this.type === ConversationType.DIRECT;
  }

  isGroupConversation(): boolean {
    return this.type === ConversationType.GROUP;
  }
}
