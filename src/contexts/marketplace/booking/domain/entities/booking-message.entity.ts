import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Booking } from './booking.entity';

@Entity('booking_messages')
@Index(['bookingId'])
@Index(['senderId'])
export class BookingMessage extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, booking => booking.messages)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column('text')
  content: string;

  @Column({ name: 'message_type', default: 'text' })
  messageType: string; // 'text' | 'file' | 'system'

  @Column('jsonb', { nullable: true })
  attachments?: string[];

  @Column({ name: 'read_at', nullable: true })
  readAt?: Date;

  // Helper methods
  markAsRead(): void {
    this.readAt = new Date();
  }

  isRead(): boolean {
    return this.readAt !== null;
  }
}
