import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { Booking } from './booking.entity';
import { CorrectionStatus } from '../value-objects/booking-enums.vo';

@Entity('booking_corrections')
@Index(['bookingId'])
@Index(['status'])
export class BookingCorrection extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, booking => booking.corrections)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column('text')
  description: string;

  @Column('jsonb', { nullable: true })
  attachments?: string[];

  @Column({ name: 'correction_number', type: 'int' })
  correctionNumber: number;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @Column({ name: 'payment_reference', nullable: true })
  paymentReference?: string;

  @Column({
    type: 'enum',
    enum: CorrectionStatus,
    default: CorrectionStatus.PENDING,
  })
  status: CorrectionStatus;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt?: Date;

  // Helper methods
  markInProgress(): void {
    this.status = CorrectionStatus.IN_PROGRESS;
  }

  resolve(): void {
    this.status = CorrectionStatus.RESOLVED;
    this.resolvedAt = new Date();
  }

  markPendingPayment(): void {
    this.status = CorrectionStatus.PENDING_PAYMENT;
  }

  markPaid(paymentReference: string): void {
    this.isPaid = true;
    this.paymentReference = paymentReference;
    this.status = CorrectionStatus.PENDING;
  }
}
