
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base-entity';
import { Contract } from './contract.entity';

@Entity('contract_deliverables')
export class Deliverable extends BaseEntity {
  @Column('text')
  description: string;

  @Column({ type: 'json', nullable: true })
  attachments: string[];

  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;
}
