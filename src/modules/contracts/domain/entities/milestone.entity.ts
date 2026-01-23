
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base-entity';
import { Contract } from './contract.entity';

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('contract_milestones')
export class Milestone extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.milestones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;
}
