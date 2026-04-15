import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { PushTokenPlatform } from '../value-objects/push-token-platform.vo';

@Entity('push_tokens')
@Index(['userId'])
@Index(['token'])
export class PushToken extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  token: string;

  @Column({ default: PushTokenPlatform.EXPO })
  platform: PushTokenPlatform;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @Column({ default: true })
  active: boolean;
}
