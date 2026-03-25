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
  static readonly TRENDING_WEIGHTS = {
    likes: 1,
    comments: 2,
    shares: 3,
  } as const;

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

  @Column({ name: 'trending_score', type: 'numeric', precision: 10, scale: 2, default: 0 })
  trendingScore: number;

  @Column({ name: 'last_engaged_at', nullable: true })
  lastEngagedAt?: Date;

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
    this.refreshTrendingMetrics();
  }

  decrementLikes(): void {
    if (this.likesCount > 0) {
      this.likesCount--;
      this.refreshTrendingMetrics();
    }
  }

  incrementComments(): void {
    this.commentsCount++;
    this.refreshTrendingMetrics();
  }

  decrementComments(): void {
    if (this.commentsCount > 0) {
      this.commentsCount--;
      this.refreshTrendingMetrics();
    }
  }

  incrementShares(): void {
    this.sharesCount++;
    this.refreshTrendingMetrics();
  }

  decrementShares(): void {
    if (this.sharesCount > 0) {
      this.sharesCount--;
      this.refreshTrendingMetrics();
    }
  }

  refreshTrendingMetrics(engagedAt = new Date()): void {
    this.trendingScore =
      this.likesCount * Post.TRENDING_WEIGHTS.likes +
      this.commentsCount * Post.TRENDING_WEIGHTS.comments +
      this.sharesCount * Post.TRENDING_WEIGHTS.shares;
    this.lastEngagedAt = engagedAt;
  }
}
