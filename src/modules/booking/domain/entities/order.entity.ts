import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Service } from '../../../service-catalog/domain/entities/service.entity';
import { Milestone } from './milestone.entity';
import { OrderStatus, PaymentStatus } from '../value-objects/booking-enums.vo';

@Entity('orders')
@Index(['customerId'])
@Index(['providerId'])
@Index(['serviceId'])
@Index(['status'])
export class Order extends BaseEntity {
  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

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

  @OneToMany(() => Milestone, milestone => milestone.order)
  milestones: Milestone[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  requirements?: Record<string, any>;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ name: 'platform_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformFee: number;

  @Column({ name: 'provider_earnings', type: 'decimal', precision: 12, scale: 2 })
  providerEarnings: number;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'payment_reference', nullable: true })
  paymentReference?: string;

  @Column({ name: 'paid_at', nullable: true })
  paidAt?: Date;

  @Column({ name: 'delivery_date', nullable: true })
  deliveryDate?: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ name: 'refunded_at', nullable: true })
  refundedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Helper methods
  markAsPaid(paymentReference: string): void {
    this.status = OrderStatus.PAID;
    this.paymentStatus = PaymentStatus.COMPLETED;
    this.paymentReference = paymentReference;
    this.paidAt = new Date();
  }

  startWork(): void {
    this.status = OrderStatus.IN_PROGRESS;
  }

  deliver(): void {
    this.status = OrderStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  complete(): void {
    this.status = OrderStatus.COMPLETED;
    this.completedAt = new Date();
  }

  cancel(reason: string): void {
    this.status = OrderStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
  }

  refund(amount: number): void {
    this.status = OrderStatus.REFUNDED;
    this.paymentStatus = PaymentStatus.REFUNDED;
    this.refundAmount = amount;
    this.refundedAt = new Date();
  }

  dispute(): void {
    this.status = OrderStatus.DISPUTED;
  }

  canCancel(): boolean {
    return [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID].includes(this.status);
  }

  canDeliver(): boolean {
    return this.status === OrderStatus.IN_PROGRESS;
  }

  canComplete(): boolean {
    return this.status === OrderStatus.DELIVERED;
  }
}
