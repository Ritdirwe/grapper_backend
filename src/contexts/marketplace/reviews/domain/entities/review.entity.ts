
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Booking } from '@contexts/marketplace/booking/domain/entities/booking.entity';

export enum ReviewType {
  CUSTOMER = 'customer',
  PROVIDER = 'provider',
}

@Entity('reviews')
@Index(['serviceId'])
@Index(['userId'])
@Index(['bookingId'])
export class Review extends BaseEntity {
  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'service_id' })
  serviceId: string;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'review_type', type: 'enum', enum: ReviewType, default: ReviewType.CUSTOMER })
  reviewType: ReviewType;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('int')
  rating: number; // 1-5

  @Column('text')
  comment: string;

  @Column('text', { nullable: true })
  response: string;

  @Column('int', { default: 0 })
  helpfulCount: number;

  @Column('jsonb', { default: [] })
  helpfulUserIds: string[]; // Track users who found it helpful to prevent duplicates
}
