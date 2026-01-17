import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Service } from './service.entity';

@Entity('reviews')
@Index(['serviceId'])
@Index(['reviewerId'])
@Unique(['serviceId', 'reviewerId'])
export class Review extends BaseEntity {
  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'service_id' })
  serviceId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', nullable: true })
  images?: string[];

  @Column({ name: 'provider_response', type: 'text', nullable: true })
  providerResponse?: string;

  @Column({ name: 'provider_response_at', nullable: true })
  providerResponseAt?: Date;

  @Column({ name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean;

  @Column({ name: 'helpful_count', default: 0 })
  helpfulCount: number;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  // Helper methods
  respond(response: string): void {
    this.providerResponse = response;
    this.providerResponseAt = new Date();
  }

  markHelpful(): void {
    this.helpfulCount += 1;
  }

  hide(): void {
    this.isHidden = true;
  }

  show(): void {
    this.isHidden = false;
  }
}
