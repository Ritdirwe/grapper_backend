import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('user_follows')
@Unique(['followerId', 'followingId'])
@Index(['followerId'])
@Index(['followingId'])
export class UserFollow extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @Column({ name: 'follower_id' })
  followerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'following_id' })
  following: User;

  @Column({ name: 'following_id' })
  followingId: string;
}
