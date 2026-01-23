
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base-entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { Gig } from './gig.entity';

export enum ProposalStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('proposals')
@Index(['gigId'])
@Index(['providerId'])
@Index(['status'])
export class Proposal extends BaseEntity {
  @Column('text')
  coverLetter: string;

  @Column('decimal', { precision: 10, scale: 2 })
  proposedPrice: number;

  @Column('int')
  deliveryTime: number; // In days

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @Column({ name: 'gig_id' })
  gigId: string;

  @ManyToOne(() => Gig, (gig) => gig.proposals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gig_id' })
  gig: Gig;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;
}
