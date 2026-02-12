import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';

@Entity('user_preferences')
export class UserPreferences extends BaseEntity {
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'email_notifications', default: true })
  emailNotifications: boolean;

  @Column({ name: 'push_notifications', default: true })
  pushNotifications: boolean;

  @Column({ name: 'sms_notifications', default: false })
  smsNotifications: boolean;

  @Column({ name: 'marketing_emails', default: true })
  marketingEmails: boolean;

  @Column({ name: 'booking_reminders', default: true })
  bookingReminders: boolean;

  @Column({ name: 'message_notifications', default: true })
  messageNotifications: boolean;

  @Column({ name: 'review_notifications', default: true })
  reviewNotifications: boolean;

  @Column({ name: 'payment_notifications', default: true })
  paymentNotifications: boolean;

  @Column({ name: 'show_online_status', default: true })
  showOnlineStatus: boolean;

  @Column({ name: 'show_profile_to_search', default: true })
  showProfileToSearch: boolean;

  @Column({ name: 'allow_messages_from_anyone', default: false })
  allowMessagesFromAnyone: boolean;

  @Column({ type: 'jsonb', nullable: true })
  customSettings?: Record<string, any>;
}
