import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Profile } from './profile.entity';
import { VerificationStatus } from '../value-objects/user-enums.vo';

@Entity('verification_requests')
@Index('idx_verification_requests_user_id', ['userId'])
@Index('idx_verification_requests_profile_id', ['profileId'])
@Index('idx_verification_requests_status', ['status'])
export class VerificationRequest extends BaseEntity {
  @ManyToOne(() => User, (user) => user.verificationRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Profile, (profile) => profile.verificationRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @Column({ name: 'profile_id' })
  profileId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ name: 'credential_type' })
  credentialType: string;

  @Column({ name: 'credential_data', type: 'jsonb', nullable: true })
  credentialData?: Record<string, any>;

  @Column({ name: 'document_urls', type: 'jsonb', nullable: true })
  documentUrls?: string[];

  @Column({ name: 'submitted_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string;
}
