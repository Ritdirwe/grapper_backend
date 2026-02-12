
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { Contract } from './contract.entity';

@Entity('contract_activities')
export class Activity extends BaseEntity {
  @Column()
  type: string;

  @Column('text')
  description: string;

  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;
}
