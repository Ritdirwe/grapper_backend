
import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Milestone } from './milestone.entity';
import { ContractFile } from './contract-file.entity';
import { Activity } from './activity.entity';

export enum ContractStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('contracts')
export class Contract extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @OneToMany(() => Milestone, (milestone) => milestone.contract, {
    cascade: true,
  })
  milestones: Milestone[];

  @OneToMany(() => ContractFile, (file) => file.contract, {
    cascade: true,
  })
  files: ContractFile[];

  @OneToMany(() => Activity, (activity) => activity.contract, {
    cascade: true,
  })
  activities: Activity[];

  // Helper method to calculate progress
  get progressPercentage(): number {
    if (!this.milestones || this.milestones.length === 0) return 0;
    const completed = this.milestones.filter(m => m.status === 'completed').length;
    return Math.round((completed / this.milestones.length) * 100);
  }
}
