import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { PostVisibility } from '../value-objects/social-enums.vo';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { Share } from './share.entity';
import { Hashtag } from './hashtag.entity';
import { JoinTable, ManyToMany } from 'typeorm';

@Entity('posts')
@Index(['userId'])
@Index(['visibility'])
@Index(['createdAt'])
export class Post extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'media_urls', type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @Column({
    type: 'enum',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
  })
  visibility: PostVisibility;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'comments_count', default: 0 })
  commentsCount: number;

  @Column({ name: 'shares_count', default: 0 })
  sharesCount: number;

  // Relations
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  @OneToMany(() => Share, (share) => share.post)
  shares: Share[];

  @ManyToMany(() => Hashtag, (hashtag) => hashtag.posts)
  @JoinTable({
    name: 'post_hashtags',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'hashtag_id', referencedColumnName: 'id' },
  })
  hashtags: Hashtag[];

  // Helper methods
  incrementLikes(): void {
    this.likesCount++;
  }

  decrementLikes(): void {
    if (this.likesCount > 0) {
      this.likesCount--;
    }
  }

  incrementComments(): void {
    this.commentsCount++;
  }

  decrementComments(): void {
    if (this.commentsCount > 0) {
      this.commentsCount--;
    }
  }

  incrementShares(): void {
    this.sharesCount++;
  }

  decrementShares(): void {
    if (this.sharesCount > 0) {
      this.sharesCount--;
    }
  }
}
