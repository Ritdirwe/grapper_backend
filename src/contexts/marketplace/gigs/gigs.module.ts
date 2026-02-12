import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gig } from './domain/entities/gig.entity';
import { Proposal } from './domain/entities/proposal.entity';
import { GigController } from './presentation/gigs.controller';
import { ProposalController } from './presentation/proposals.controller';
import { GigService } from './application/services/gig.service';

@Module({
  imports: [TypeOrmModule.forFeature([Gig, Proposal])],
  controllers: [GigController, ProposalController],
  providers: [GigService],
  exports: [GigService],
})
export class GigsModule {}
