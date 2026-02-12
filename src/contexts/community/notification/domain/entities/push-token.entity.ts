import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';

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

  @Column({ default: 'expo' })
  platform: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @Column({ default: true })
  active: boolean;
}
