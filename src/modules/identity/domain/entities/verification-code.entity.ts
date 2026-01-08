import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { VerificationType } from '../value-objects/user-role.vo';

@Entity('verification_codes')
@Index(['userId', 'type', 'code'])
export class VerificationCode extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: VerificationType,
  })
  type: VerificationType;

  @Column({ length: 6 })
  code: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @Column({ name: 'used_at', nullable: true })
  usedAt?: Date;

  @Column({ nullable: true })
  email?: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.isUsed && !this.isExpired();
  }

  markAsUsed(): void {
    this.isUsed = true;
    this.usedAt = new Date();
  }

  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static getExpiryDate(minutes: number = 15): Date {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }
}
