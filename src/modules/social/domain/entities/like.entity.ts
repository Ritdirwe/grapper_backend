import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { LikeType } from '../value-objects/social-enums.vo';

@Entity('likes')
@Index(['userId'])
@Index(['postId'])
@Index(['commentId'])
@Unique(['userId', 'postId'])
@Unique(['userId', 'commentId'])
export class Like extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Post, (post) => post.likes, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: Post;

  @Column({ name: 'post_id', nullable: true })
  postId?: string;

  @ManyToOne(() => Comment, (comment) => comment.likes, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment?: Comment;

  @Column({ name: 'comment_id', nullable: true })
  commentId?: string;

  @Column({
    type: 'enum',
    enum: LikeType,
    default: LikeType.LIKE,
  })
  type: LikeType;
}
