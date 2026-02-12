import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';

@Entity('saved_providers')
@Index(['userId'])
@Index(['providerId'])
@Unique(['userId', 'providerId'])
export class SavedProvider extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'saved_at', default: () => 'CURRENT_TIMESTAMP' })
  savedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
