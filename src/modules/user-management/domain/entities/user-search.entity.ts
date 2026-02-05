import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';

@Entity('user_searches')
@Index(['userId'])
@Index(['createdAt'])
export class UserSearch extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  query: string;

  @Column({ name: 'search_type', default: 'general' })
  searchType: string;

  @Column({ name: 'result_count', nullable: true })
  resultCount?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
