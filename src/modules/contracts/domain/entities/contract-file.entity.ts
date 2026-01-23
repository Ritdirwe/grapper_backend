
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base-entity';
import { Contract } from './contract.entity';

@Entity('contract_files')
export class ContractFile extends BaseEntity {
  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  type: string;

  @Column('int', { nullable: true })
  size: number;

  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;
}
