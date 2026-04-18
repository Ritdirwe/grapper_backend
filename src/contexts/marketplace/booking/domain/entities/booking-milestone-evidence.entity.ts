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
import { BookingMilestone } from './booking-milestone.entity';

@Entity('booking_milestone_evidences')
@Index(['bookingId'])
@Index(['milestoneId'])
@Index(['uploadedBy'])
export class BookingMilestoneEvidence extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'milestone_id' })
  milestoneId: string;

  @ManyToOne(() => BookingMilestone, (milestone) => milestone.evidences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milestone_id' })
  milestone: BookingMilestone;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ name: 'storage_path' })
  storagePath: string;

  @Column()
  url: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'external_url', nullable: true })
  externalUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
