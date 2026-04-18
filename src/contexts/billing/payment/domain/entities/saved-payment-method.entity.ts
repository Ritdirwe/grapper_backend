import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { PaymentGateway } from '../value-objects/payment-enums.vo';

@Entity('saved_payment_methods')
@Index(['userId'])
@Index(['userId', 'isDefault'])
@Index(['gateway', 'providerAuthorizationId'], { unique: true })
export class SavedPaymentMethod extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: PaymentGateway,
  })
  gateway: PaymentGateway;

  @Column({ name: 'provider_authorization_id' })
  providerAuthorizationId: string;

  @Column({ name: 'authorization_code', nullable: true })
  authorizationCode?: string;

  @Column({ name: 'card_brand', nullable: true })
  cardBrand?: string;

  @Column({ name: 'last4', nullable: true })
  last4?: string;

  @Column({ name: 'expiry_month', nullable: true })
  expiryMonth?: string;

  @Column({ name: 'expiry_year', nullable: true })
  expiryYear?: string;

  @Column({ name: 'is_reusable', default: true })
  isReusable: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  markAsDefault(): void {
    this.isDefault = true;
  }

  clearDefault(): void {
    this.isDefault = false;
  }
}
