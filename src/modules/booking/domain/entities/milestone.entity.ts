import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { Order } from './order.entity';
import { MilestoneStatus } from '../value-objects/booking-enums.vo';

@Entity('milestones')
@Index(['orderId'])
@Index(['status'])
export class Milestone extends BaseEntity {
  @ManyToOne(() => Order, order => order.milestones)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @Column({ name: 'due_date', nullable: true })
  dueDate?: Date;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  deliverables?: string[];

  @Column({ name: 'submitted_at', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'rejected_at', nullable: true })
  rejectedAt?: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];

  // Helper methods
  start(): void {
    this.status = MilestoneStatus.IN_PROGRESS;
  }

  submit(attachments?: string[]): void {
    this.status = MilestoneStatus.SUBMITTED;
    this.submittedAt = new Date();
    if (attachments) {
      this.attachments = attachments;
    }
  }

  approve(): void {
    this.status = MilestoneStatus.APPROVED;
    this.approvedAt = new Date();
  }

  reject(reason: string): void {
    this.status = MilestoneStatus.REJECTED;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
  }

  canSubmit(): boolean {
    return [MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS, MilestoneStatus.REJECTED].includes(
      this.status,
    );
  }

  canApprove(): boolean {
    return this.status === MilestoneStatus.SUBMITTED;
  }
}
