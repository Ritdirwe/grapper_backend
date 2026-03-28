import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { SupportTicket } from './support-ticket.entity';
import { SupportTicketSenderRole } from '../value-objects/support-ticket-enums.vo';

@Entity('support_ticket_messages')
@Index(['ticketId'])
@Index(['senderId'])
@Index(['createdAt'])
export class SupportTicketMessage extends BaseEntity {
  @ManyToOne(() => SupportTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  @Column({ name: 'sender_id', nullable: true })
  senderId?: string;

  @Column({
    name: 'sender_role',
    type: 'enum',
    enum: SupportTicketSenderRole,
    default: SupportTicketSenderRole.USER,
  })
  senderRole: SupportTicketSenderRole;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];

  @Column({ name: 'is_internal_note', type: 'boolean', default: false })
  isInternalNote: boolean;
}
