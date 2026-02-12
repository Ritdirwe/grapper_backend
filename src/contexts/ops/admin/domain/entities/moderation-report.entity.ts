import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { ReportStatus, ReportReason } from '../value-objects/moderation-enums.vo';

@Entity('moderation_reports')
@Index(['reporterId'])
@Index(['targetId'])
@Index(['status'])
export class ModerationReport extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reporter_id' })
  reporterId: string;

  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ name: 'target_id' })
  targetId: string;

  @Column({
    type: 'enum',
    enum: ReportReason,
    default: ReportReason.OTHER,
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy?: User;

  @Column({ name: 'resolved_by_id', nullable: true })
  resolvedById?: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date;
}
