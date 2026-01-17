import {
  Entity,
  Column,
  ManyToMany,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { Post } from './post.entity';

@Entity('hashtags')
@Index(['name'], { unique: true })
export class Hashtag extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'posts_count', default: 0 })
  postsCount: number;

  @UpdateDateColumn({ name: 'last_used_at' })
  lastUsedAt: Date;

  @ManyToMany(() => Post, (post) => post.hashtags)
  posts: Post[];

  // Helper methods
  normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
