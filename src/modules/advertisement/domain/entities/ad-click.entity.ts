import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { Advertisement } from './advertisement.entity';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('ad_clicks')
@Index(['adId'])
@Index(['userId'])
@Index(['createdAt'])
export class AdClick extends BaseEntity {
  @ManyToOne(() => Advertisement, (ad) => ad.clicks)
  @JoinColumn({ name: 'ad_id' })
  ad: Advertisement;

  @Column({ name: 'ad_id' })
  adId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  clicker?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number;
}
