import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Post } from './post.entity';
import { Like } from './like.entity';

@Entity('comments')
@Index(['postId'])
@Index(['userId'])
@Index(['parentCommentId'])
export class Comment extends BaseEntity {
  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: Comment;

  @Column({ name: 'parent_comment_id', nullable: true })
  parentCommentId?: string;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  // Relations
  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];

  @OneToMany(() => Like, (like) => like.comment)
  likes: Like[];

  // Helper methods
  incrementLikes(): void {
    this.likesCount++;
  }

  decrementLikes(): void {
    if (this.likesCount > 0) {
      this.likesCount--;
    }
  }

  isReply(): boolean {
    return !!this.parentCommentId;
  }
}
