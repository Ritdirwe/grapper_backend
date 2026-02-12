import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionStatus } from '../value-objects/subscription-enums.vo';

@Entity('subscriptions')
@Index(['userId'])
@Index(['planId'])
@Index(['status'])
@Index(['currentPeriodEnd'])
export class Subscription extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ name: 'trial_start', nullable: true })
  trialStart?: Date;

  @Column({ name: 'trial_end', nullable: true })
  trialEnd?: Date;

  @Column({ name: 'canceled_at', nullable: true })
  canceledAt?: Date;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'provider_subscription_id', nullable: true })
  providerSubscriptionId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE &&
           new Date() < this.currentPeriodEnd;
  }

  isTrialing(): boolean {
    return this.status === SubscriptionStatus.TRIALING &&
           this.trialEnd &&
           new Date() < this.trialEnd;
  }

  isCanceled(): boolean {
    return this.status === SubscriptionStatus.CANCELED;
  }

  isExpired(): boolean {
    return this.status === SubscriptionStatus.EXPIRED ||
           new Date() > this.currentPeriodEnd;
  }

  cancel(immediately = false): void {
    if (immediately) {
      this.status = SubscriptionStatus.CANCELED;
      this.canceledAt = new Date();
    } else {
      this.cancelAtPeriodEnd = true;
    }
  }

  renew(periodEnd: Date): void {
    this.currentPeriodStart = this.currentPeriodEnd;
    this.currentPeriodEnd = periodEnd;
    this.status = SubscriptionStatus.ACTIVE;
  }

  endTrial(): void {
    if (this.isTrialing()) {
      this.status = SubscriptionStatus.ACTIVE;
    }
  }
}
