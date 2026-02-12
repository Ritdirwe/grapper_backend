import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { UserRole, UserStatus } from '@contexts/identity/domain/value-objects/user-role.vo';
import { RefreshToken } from './refresh-token.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { ProviderProfile } from '@contexts/identity/user-management/domain/entities/provider-profile.entity';
import { VerificationRequest } from '@contexts/identity/user-management/domain/entities/verification-request.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'phone_number', nullable: true, unique: true })
  phoneNumber?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'suspended_until', nullable: true })
  suspendedUntil?: Date;

  @Column({ name: 'banned_at', nullable: true })
  bannedAt?: Date;

  @Column({ name: 'ban_reason', nullable: true })
  banReason?: string;

  @Column({ default: 0 })
  strikes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToOne(() => Profile, (profile) => profile.user)
  profile?: Profile;

  @OneToOne(() => ProviderProfile, (profile) => profile.user)
  providerProfile?: ProviderProfile;

  @OneToMany(() => VerificationRequest, (verification) => verification.user)
  verificationRequests: VerificationRequest[];

  // Helper methods
  isSuspended(): boolean {
    if (!this.suspendedUntil) return false;
    return new Date() < this.suspendedUntil;
  }

  isBanned(): boolean {
    return !!this.bannedAt;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.isSuspended() && !this.isBanned();
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isProvider(): boolean {
    return this.role === UserRole.PROVIDER;
  }

  canLogin(): boolean {
    return this.isActive() && this.emailVerified;
  }
}
