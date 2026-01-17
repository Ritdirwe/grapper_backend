import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { AdStatus, AdType } from '../value-objects/ad-enums.vo';
import { AdImpression } from './ad-impression.entity';
import { AdClick } from './ad-click.entity';

@Entity('advertisements')
@Index(['userId'])
@Index(['status'])
@Index(['adType'])
export class Advertisement extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'media_urls', type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @Column({ name: 'cta_url' })
  ctaUrl: string;

  @Column({
    type: 'enum',
    enum: AdType,
    default: AdType.SPONSORED_POST,
  })
  adType: AdType;

  @Column({
    type: 'enum',
    enum: AdStatus,
    default: AdStatus.DRAFT,
  })
  status: AdStatus;

  // Budget & Cost
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ name: 'remaining_budget', type: 'decimal', precision: 10, scale: 2 })
  remainingBudget: number;

  @Column({ name: 'cost_per_click', type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerClick: number;

  @Column({ name: 'cost_per_impression', type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerImpression: number;

  // Targeting
  @Column({ type: 'jsonb', nullable: true })
  targetingRules?: {
    interests?: string[];
    locations?: string[];
    ageRange?: [number, number];
    userRoles?: string[];
  };

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  // Stats (Denormalized for performance)
  @Column({ name: 'total_impressions', default: 0 })
  totalImpressions: number;

  @Column({ name: 'total_clicks', default: 0 })
  totalClicks: number;

  @Column({ name: 'total_likes', default: 0 })
  totalLikes: number;

  // Relations
  @OneToMany(() => AdImpression, (impression: AdImpression) => impression.ad)
  impressions: AdImpression[];

  @OneToMany(() => AdClick, (click: AdClick) => click.ad)
  clicks: AdClick[];

  // Helper methods
  isActive(): boolean {
    const now = new Date();
    return (
      this.status === AdStatus.ACTIVE &&
      this.remainingBudget > 0 &&
      now >= this.startDate &&
      (!this.endDate || now <= this.endDate)
    );
  }

  deductBudget(amount: number): boolean {
    if (this.remainingBudget >= amount) {
      this.remainingBudget -= amount;
      if (this.remainingBudget <= 0) {
        this.status = AdStatus.COMPLETED;
      }
      return true;
    }
    return false;
  }
}
