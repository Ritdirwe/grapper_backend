
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './domain/entities/contract.entity';
import { Milestone } from './domain/entities/milestone.entity';
import { ContractFile } from './domain/entities/contract-file.entity';
import { Activity } from './domain/entities/activity.entity';
import { Deliverable } from './domain/entities/deliverable.entity';
import { ContractController } from './presentation/contracts.controller';
import { ContractService } from './application/services/contract.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      Milestone,
      ContractFile,
      Activity,
      Deliverable,
    ]),
  ],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractsModule {}
