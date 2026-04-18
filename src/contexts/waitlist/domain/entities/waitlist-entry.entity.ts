import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { WaitlistRole } from '../../application/dto/waitlist.dto';
import { Gender, VerificationStatus } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';

@Entity('waitlist_entries')
export class WaitlistEntry extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ name: 'phone_number', nullable: true, unique: true })
  phoneNumber?: string;

  @Column({ type: 'enum', enum: WaitlistRole })
  role: WaitlistRole;

  @Column({ name: 'password_hash' })
  passwordHash: string;

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

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  university?: string;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };

  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.UNVERIFIED })
  verificationStatus: VerificationStatus;

  @Column({ name: 'verification_document_url', nullable: true })
  verificationDocumentUrl?: string;

  @Column({ name: 'business_name', nullable: true })
  businessName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  skills?: string[];

  @Column({ type: 'jsonb', nullable: true })
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number;
    url?: string;
  }>;

  @Column({ name: 'years_of_experience', nullable: true })
  yearsOfExperience?: number;

  @Column({ type: 'jsonb', nullable: true })
  portfolio?: Array<{
    title: string;
    description: string;
    imageUrl: string;
    projectUrl?: string;
  }>;

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate?: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({ name: 'response_time_hours', nullable: true })
  responseTimeHours?: number;

  @Column({ name: 'completion_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Column({ name: 'total_earnings', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ name: 'total_jobs', default: 0 })
  totalJobs: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'availability_hours', type: 'jsonb', nullable: true })
  availabilityHours?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };

  @Column({ name: 'last_active_at', nullable: true })
  lastActiveAt?: Date;

  @Column({ name: 'stripe_account_id', nullable: true })
  stripeAccountId?: string;

  @Column({ name: 'stripe_onboarding_complete', default: false })
  stripeOnboardingComplete: boolean;

  @Column({ name: 'paystack_subaccount_code', nullable: true })
  paystackSubaccountCode?: string;

  @Column({ name: 'is_promoted', default: false })
  isPromoted: boolean;

  @Column({ name: 'promoted_user_id', nullable: true })
  promotedUserId?: string;

  @Column({ name: 'promoted_at', nullable: true })
  promotedAt?: Date;
}
