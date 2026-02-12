import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Category } from './category.entity';
import { ServiceStatus, PricingType, DeliveryType } from '../value-objects/service-enums.vo';

@Entity('services')
@Index(['providerId'])
@Index(['categoryId'])
@Index(['status'])
export class Service extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({
    name: 'pricing_type',
    type: 'enum',
    enum: PricingType,
    default: PricingType.FIXED,
  })
  pricingType: PricingType;

  @Column({
    name: 'delivery_type',
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.BOTH,
  })
  deliveryType: DeliveryType;

  @Column({ name: 'duration_hours', nullable: true })
  durationHours?: number;

  @Column({ name: 'duration_days', nullable: true })
  durationDays?: number;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.DRAFT,
  })
  status: ServiceStatus;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  features?: string[];

  @Column({ type: 'jsonb', nullable: true })
  requirements?: string[];

  @Column({ type: 'jsonb', nullable: true })
  faqs?: Array<{ question: string; answer: string }>;

  @Column({ name: 'cover_image_url', nullable: true })
  coverImageUrl?: string;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column({ name: 'total_orders', default: 0 })
  totalOrders: number;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_promoted', default: false })
  isPromoted: boolean;

  @Column({ nullable: true })
  location?: string;

  @Column({ name: 'service_area', type: 'jsonb', nullable: true })
  serviceArea?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Helper methods
  incrementViews(): void {
    this.viewCount += 1;
  }

  incrementOrders(): void {
    this.totalOrders += 1;
  }

  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.totalReviews + newRating;
    this.totalReviews += 1;
    this.averageRating = totalRating / this.totalReviews;
  }

  isAvailable(): boolean {
    return this.status === ServiceStatus.ACTIVE;
  }

  canEdit(): boolean {
    return [ServiceStatus.DRAFT, ServiceStatus.PAUSED].includes(this.status);
  }
}
