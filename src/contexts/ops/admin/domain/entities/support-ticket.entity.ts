import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../value-objects/support-ticket-enums.vo';
import { SupportTicketMessage } from './support-ticket-message.entity';

@Entity('support_tickets')
@Index(['creatorId'])
@Index(['status'])
@Index(['category'])
@Index(['lastReplyAt'])
export class SupportTicket extends BaseEntity {
  @Column({ name: 'ticket_number', unique: true })
  ticketNumber: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @Column({
    type: 'enum',
    enum: SupportTicketCategory,
    default: SupportTicketCategory.OTHER,
  })
  category: SupportTicketCategory;

  @Column({ name: 'target_id', nullable: true })
  targetId?: string;

  @Column({ type: 'varchar', length: 180 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;

  @Column({
    type: 'enum',
    enum: SupportTicketPriority,
    default: SupportTicketPriority.NORMAL,
  })
  priority: SupportTicketPriority;

  @Column({ name: 'last_reply_at', type: 'timestamp', nullable: true })
  lastReplyAt?: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt?: Date;

  @OneToMany(() => SupportTicketMessage, (message) => message.ticket)
  messages?: SupportTicketMessage[];
}
