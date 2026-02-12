
import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Proposal } from './proposal.entity';

export enum GigStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('gigs')
@Index(['clientId'])
@Index(['category'])
@Index(['status'])
export class Gig extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  category: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: GigStatus,
    default: GigStatus.ACTIVE,
  })
  status: GigStatus;

  @Column({ name: 'delivery_time', type: 'int', nullable: true })
  deliveryTime: number; // In days

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client: User;

  @OneToMany(() => Proposal, (proposal) => proposal.gig)
  proposals: Proposal[];

  @Column('int', { default: 0 })
  proposalCount: number;
}
