import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { AuditAction } from '../value-objects/reporting-enums.vo';

@Entity('audit_logs')
@Index(['actorId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'actor_id' })
  actorId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ name: 'target_type', nullable: true })
  targetType?: string;

  @Column({ name: 'target_id', nullable: true })
  targetId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;
}
