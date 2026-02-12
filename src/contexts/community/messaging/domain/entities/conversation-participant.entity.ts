import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Conversation } from './conversation.entity';
import { ParticipantRole } from '../value-objects/messaging-enums.vo';

@Entity('conversation_participants')
@Index(['conversationId'])
@Index(['userId'])
@Unique(['conversationId', 'userId'])
export class ConversationParticipant extends BaseEntity {
  @ManyToOne(() => Conversation, (conversation) => conversation.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
  })
  role: ParticipantRole;

  @Column({ name: 'last_read_message_id', nullable: true })
  lastReadMessageId?: string;

  @Column({ name: 'last_read_at', nullable: true })
  lastReadAt?: Date;

  @Column({ name: 'muted_until', nullable: true })
  mutedUntil?: Date;

  @Column({ name: 'joined_at', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  // Helper methods
  updateLastRead(messageId: string): void {
    this.lastReadMessageId = messageId;
    this.lastReadAt = new Date();
  }

  isMuted(): boolean {
    if (!this.mutedUntil) return false;
    return new Date() < this.mutedUntil;
  }

  mute(duration: number): void {
    const mutedUntil = new Date();
    mutedUntil.setHours(mutedUntil.getHours() + duration);
    this.mutedUntil = mutedUntil;
  }

  unmute(): void {
    this.mutedUntil = null;
  }

  isAdmin(): boolean {
    return this.role === ParticipantRole.ADMIN;
  }

  promoteToAdmin(): void {
    this.role = ParticipantRole.ADMIN;
  }

  demoteToMember(): void {
    this.role = ParticipantRole.MEMBER;
  }
}
