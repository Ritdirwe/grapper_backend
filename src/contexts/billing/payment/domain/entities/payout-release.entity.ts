import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';

export enum PayoutReleaseSourceType {
  ORDER = 'order',
  BOOKING = 'booking',
}

export enum PayoutReleaseMode {
  MILESTONE = 'milestone',
  MANUAL = 'manual',
}

@Entity('payout_releases')
@Index(['providerId'])
@Index(['sourceType', 'sourceId'])
export class PayoutRelease extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'source_type', type: 'varchar', length: 32 })
  sourceType: PayoutReleaseSourceType;

  @Column({ name: 'source_id' })
  sourceId: string;

  @Column({ name: 'release_mode', type: 'varchar', length: 32 })
  releaseMode: PayoutReleaseMode;

  @Column({ name: 'milestone_id', nullable: true })
  milestoneId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ name: 'progress_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  progressPercent?: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'released_by' })
  releasedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
