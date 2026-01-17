import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import {
  TransactionType,
  TransactionStatus,
  PaymentGateway,
} from '../value-objects/payment-enums.vo';

@Entity('transactions')
@Index(['userId'])
@Index(['orderId'])
@Index(['reference'])
@Index(['status'])
export class Transaction extends BaseEntity {
  @Column({ unique: true })
  reference: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: PaymentGateway,
  })
  gateway: PaymentGateway;

  @Column({ name: 'gateway_reference', nullable: true })
  gatewayReference?: string;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse?: Record<string, any>;

  @Column({ name: 'paid_at', nullable: true })
  paidAt?: Date;

  @Column({ name: 'failed_at', nullable: true })
  failedAt?: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string;

  // Helper methods
  markAsProcessing(): void {
    this.status = TransactionStatus.PROCESSING;
  }

  markAsCompleted(gatewayReference: string, gatewayResponse?: Record<string, any>): void {
    this.status = TransactionStatus.COMPLETED;
    this.gatewayReference = gatewayReference;
    this.paidAt = new Date();
    if (gatewayResponse) {
      this.gatewayResponse = gatewayResponse;
    }
  }

  markAsFailed(reason: string): void {
    this.status = TransactionStatus.FAILED;
    this.failedAt = new Date();
    this.failureReason = reason;
  }

  markAsRefunded(): void {
    this.status = TransactionStatus.REFUNDED;
  }

  cancel(): void {
    this.status = TransactionStatus.CANCELLED;
  }
}
