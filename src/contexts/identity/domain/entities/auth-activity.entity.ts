import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from './user.entity';
import { AuthActivityAction } from '../value-objects/auth-activity-action.vo';

@Entity('auth_activities')
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
export class AuthActivity extends BaseEntity {
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: AuthActivityAction,
  })
  action: AuthActivityAction;

  @Column({ nullable: true })
  email?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
