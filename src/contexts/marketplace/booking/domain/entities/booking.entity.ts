import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { BookingStatus } from '../value-objects/booking-enums.vo';
import { BookingCorrection } from './booking-correction.entity';
import { BookingFile } from './booking-file.entity';
import { BookingMessage } from './booking-message.entity';

@Entity('bookings')
@Index(['customerId'])
@Index(['providerId'])
@Index(['serviceId'])
@Index(['status'])
@Index(['referenceCode'])
export class Booking extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ name: 'scheduled_date', nullable: true })
  scheduledDate?: Date;

  @Column({ name: 'scheduled_time', nullable: true })
  scheduledTime?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'jsonb', nullable: true })
  requirements?: Record<string, any>;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ name: 'confirmed_at', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy?: string;

  @Column({ name: 'reference_code', unique: true, nullable: true })
  referenceCode?: string;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  depositAmount?: number;

  @Column({ name: 'platform_fee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  platformFee?: number;

  @Column({ name: 'deposit_paid', default: false })
  depositPaid: boolean;

  @Column({ name: 'final_payment_paid', default: false })
  finalPaymentPaid: boolean;

  @Column({ name: 'stripe_session_id', nullable: true })
  stripeSessionId?: string;

  @Column({ name: 'paystack_reference', nullable: true })
  paystackReference?: string;

  @Column({ name: 'cancellation_deadline', nullable: true })
  cancellationDeadline?: Date;

  @Column({ name: 'booking_deadline', nullable: true })
  bookingDeadline?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Corrections tracking
  @Column({ name: 'corrections_used', type: 'int', default: 0 })
  correctionsUsed: number;

  @Column({ name: 'corrections_limit', type: 'int', default: 5 })
  correctionsLimit: number;

  @Column({ name: 'correction_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  correctionFee: number;

  // Customer approval
  @Column({ name: 'customer_approved', default: false })
  customerApproved: boolean;

  @Column({ name: 'customer_approved_at', nullable: true })
  customerApprovedAt?: Date;

  // Relations to workspace entities
  @OneToMany(() => BookingCorrection, correction => correction.booking)
  corrections: BookingCorrection[];

  @OneToMany(() => BookingFile, file => file.booking)
  files: BookingFile[];

  @OneToMany(() => BookingMessage, message => message.booking)
  messages: BookingMessage[];

  // Helper methods
  confirm(): void {
    this.status = BookingStatus.CONFIRMED;
    this.confirmedAt = new Date();
  }

  start(): void {
    this.status = BookingStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  complete(): void {
    this.status = BookingStatus.COMPLETED;
    this.completedAt = new Date();
  }

  cancel(reason: string, cancelledBy: string): void {
    this.status = BookingStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.cancelledBy = cancelledBy;
  }

  dispute(): void {
    this.status = BookingStatus.DISPUTED;
  }

  canCancel(): boolean {
    return [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(this.status);
  }

  canStart(): boolean {
    return this.status === BookingStatus.CONFIRMED;
  }

  canComplete(): boolean {
    return this.status === BookingStatus.IN_PROGRESS;
  }

  // Delivery workflow
  deliver(): void {
    this.status = BookingStatus.DELIVERED;
  }

  canDeliver(): boolean {
    return [BookingStatus.IN_PROGRESS, BookingStatus.REVISION_REQUESTED].includes(this.status);
  }

  canApproveDelivery(): boolean {
    return this.status === BookingStatus.DELIVERED;
  }

  approveWork(): void {
    this.customerApproved = true;
    this.customerApprovedAt = new Date();
    this.status = BookingStatus.COMPLETED;
    this.completedAt = new Date();
  }

  canRequestCorrection(): boolean {
    return this.status === BookingStatus.DELIVERED;
  }

  canRequestFreeCorrection(): boolean {
    return this.correctionsUsed < this.correctionsLimit &&
           this.canRequestCorrection();
  }

  requestCorrection(): boolean {
    this.correctionsUsed += 1;
    this.status = BookingStatus.REVISION_REQUESTED;
    return this.correctionsUsed <= this.correctionsLimit; // true = free, false = paid
  }
}
