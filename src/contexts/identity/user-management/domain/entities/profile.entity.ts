import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Gender, VerificationStatus } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';
import { VerificationRequest } from './verification-request.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'full_name', nullable: true })
  fullName?: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'cover_image_url', nullable: true })
  coverImageUrl?: string;

  @Column({ type: 'date', nullable: true })
  birthdate?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verificationStatus: VerificationStatus;

  @Column({ name: 'verification_document_url', nullable: true })
  verificationDocumentUrl?: string;

  @Column({ name: 'verified_at', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'strike_count', default: 0 })
  strikeCount: number;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'followers_count', default: 0 })
  followersCount: number;

  @Column({ name: 'following_count', default: 0 })
  followingCount: number;

  @OneToMany(() => VerificationRequest, (verification) => verification.profile)
  verificationRequests: VerificationRequest[];

  // Helper methods
  isVerified(): boolean {
    return this.verificationStatus === VerificationStatus.VERIFIED;
  }

  canProvideServices(): boolean {
    return this.isVerified() && this.strikeCount < 3;
  }

  incrementStrike(): void {
    this.strikeCount += 1;
  }

  resetStrikes(): void {
    this.strikeCount = 0;
  }
}
