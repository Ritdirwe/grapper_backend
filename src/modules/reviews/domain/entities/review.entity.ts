
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Service } from '../../../service-catalog/domain/entities/service.entity';

@Entity('reviews')
@Index(['serviceId'])
@Index(['userId'])
export class Review extends BaseEntity {
  @Column({ name: 'service_id' })
  serviceId: string;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('int')
  rating: number; // 1-5

  @Column('text')
  comment: string;

  @Column('text', { nullable: true })
  response: string;

  @Column('int', { default: 0 })
  helpfulCount: number;

  @Column('jsonb', { default: [] })
  helpfulUserIds: string[]; // Track users who found it helpful to prevent duplicates
}
