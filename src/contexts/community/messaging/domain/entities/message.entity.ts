import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('messages')
@Index(['conversationId'])
@Index(['senderId'])
@Index(['createdAt'])
export class Message extends BaseEntity {
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'media_urls', type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyToMessage?: Message;

  @Column({ name: 'reply_to_message_id', nullable: true })
  replyToMessageId?: string;

  @Column({ name: 'read_by', type: 'jsonb', default: [] })
  readBy: string[]; // Array of user IDs who read this message

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Helper methods
  markAsReadBy(userId: string): void {
    if (!this.readBy.includes(userId)) {
      this.readBy.push(userId);
    }
  }

  isReadBy(userId: string): boolean {
    return this.readBy.includes(userId);
  }

  isDeleted(): boolean {
    return !!this.deletedAt;
  }
}
