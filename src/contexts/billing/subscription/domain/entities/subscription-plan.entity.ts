import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { BillingInterval, PlanTier } from '../value-objects/subscription-enums.vo';

@Entity('subscription_plans')
@Index(['tier'])
@Index(['isActive'])
export class SubscriptionPlan extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PlanTier,
    default: PlanTier.FREE,
  })
  tier: PlanTier;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({
    type: 'enum',
    enum: BillingInterval,
    default: BillingInterval.MONTH,
  })
  billingInterval: BillingInterval;

  @Column({ name: 'trial_days', default: 0 })
  trialDays: number;

  @Column({ type: 'jsonb', nullable: true })
  features?: {
    maxServices?: number;
    maxBookings?: number;
    prioritySupport?: boolean;
    analytics?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
    [key: string]: any;
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_popular', default: false })
  isPopular: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  isFree(): boolean {
    return this.tier === PlanTier.FREE || this.price === 0;
  }

  hasTrialPeriod(): boolean {
    return this.trialDays > 0;
  }

  getMonthlyPrice(): number {
    switch (this.billingInterval) {
      case BillingInterval.DAY:
        return this.price * 30;
      case BillingInterval.WEEK:
        return this.price * 4;
      case BillingInterval.MONTH:
        return this.price;
      case BillingInterval.YEAR:
        return this.price / 12;
      default:
        return this.price;
    }
  }
}
