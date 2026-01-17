import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { PayoutProvider } from '../value-objects/user-enums.vo';

@Entity('payout_methods')
export class PayoutMethod extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: PayoutProvider,
  })
  provider: PayoutProvider;

  @Column({ name: 'account_name' })
  accountName: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber?: string;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'bank_code', nullable: true })
  bankCode?: string;

  @Column({ name: 'stripe_account_id', nullable: true })
  stripeAccountId?: string;

  @Column({ name: 'paystack_recipient_code', nullable: true })
  paystackRecipientCode?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Helper methods
  markAsDefault(): void {
    this.isDefault = true;
  }

  verify(): void {
    this.isVerified = true;
  }

  setPaystackRecipient(recipientCode: string): void {
    this.paystackRecipientCode = recipientCode;
  }
}
