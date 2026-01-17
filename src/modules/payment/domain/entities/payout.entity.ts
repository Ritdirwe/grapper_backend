import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { PayoutMethod } from '../../../user-management/domain/entities/payout-method.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('payouts')
@Index(['providerId'])
@Index(['status'])
export class Payout extends BaseEntity {
  @Column({ unique: true })
  reference: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => PayoutMethod, { nullable: true })
  @JoinColumn({ name: 'payout_method_id' })
  payoutMethod: PayoutMethod;

  @Column({ name: 'payout_method_id', nullable: true })
  payoutMethodId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  @Column({ name: 'gateway_reference', nullable: true })
  gatewayReference?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse?: Record<string, any>;

  @Column({ name: 'processed_at', nullable: true })
  processedAt?: Date;

  @Column({ name: 'failed_at', nullable: true })
  failedAt?: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string;

  // Helper methods
  markAsProcessing(): void {
    this.status = PayoutStatus.PROCESSING;
  }

  markAsCompleted(gatewayReference: string, gatewayResponse?: Record<string, any>): void {
    this.status = PayoutStatus.COMPLETED;
    this.gatewayReference = gatewayReference;
    this.processedAt = new Date();
    if (gatewayResponse) {
      this.gatewayResponse = gatewayResponse;
    }
  }

  markAsFailed(reason: string): void {
    this.status = PayoutStatus.FAILED;
    this.failedAt = new Date();
    this.failureReason = reason;
  }

  cancel(): void {
    this.status = PayoutStatus.CANCELLED;
  }
}
