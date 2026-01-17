import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Order } from './order.entity';
import { DisputeStatus, DisputeReason } from '../value-objects/booking-enums.vo';

@Entity('disputes')
@Index(['orderId'])
@Index(['raisedBy'])
@Index(['status'])
export class Dispute extends BaseEntity {
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'raised_by' })
  raiser: User;

  @Column({ name: 'raised_by' })
  raisedBy: string;

  @Column({
    type: 'enum',
    enum: DisputeReason,
  })
  reason: DisputeReason;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence?: string[];

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  status: DisputeStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string;

  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy?: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  refundAmount?: number;

  // Helper methods
  review(): void {
    this.status = DisputeStatus.UNDER_REVIEW;
  }

  resolve(resolution: string, resolvedBy: string, refundAmount?: number): void {
    this.status = DisputeStatus.RESOLVED;
    this.resolution = resolution;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    if (refundAmount !== undefined) {
      this.refundAmount = refundAmount;
    }
  }

  close(): void {
    this.status = DisputeStatus.CLOSED;
  }
}
