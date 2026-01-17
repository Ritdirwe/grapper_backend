import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('provider_profiles')
export class ProviderProfile extends BaseEntity {
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  userId: string;

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

  // Helper methods
  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.totalReviews + newRating;
    this.totalReviews += 1;
    this.averageRating = totalRating / this.totalReviews;
  }

  incrementJobs(): void {
    this.totalJobs += 1;
  }

  addEarnings(amount: number): void {
    this.totalEarnings += amount;
  }

  updateCompletionRate(completed: boolean): void {
    const totalCompleted = this.completionRate * this.totalJobs;
    const newCompleted = completed ? totalCompleted + 1 : totalCompleted;
    this.completionRate = (newCompleted / (this.totalJobs + 1)) * 100;
  }
}
