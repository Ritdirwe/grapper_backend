
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gig, GigStatus } from '../../domain/entities/gig.entity';
import { Proposal, ProposalStatus } from '../../domain/entities/proposal.entity';
import { CreateGigDto, UpdateGigDto, CreateProposalDto } from '../dto/gig.dto';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';

@Injectable()
export class GigService {
  constructor(
    @InjectRepository(Gig)
    private gigRepository: Repository<Gig>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
  ) {}

  async create(userId: string, dto: CreateGigDto): Promise<Gig> {
    const gig = this.gigRepository.create({
      ...dto,
      clientId: userId,
    } as Gig);

    return this.gigRepository.save(gig);
  }

  async findAll(filters: any, page = 1, limit = 20): Promise<PaginatedResponseDto<Gig>> {
    const query = this.gigRepository.createQueryBuilder('gig')
        .leftJoinAndSelect('gig.client', 'client')
        .where('gig.status = :status', { status: GigStatus.ACTIVE })
        .orderBy('gig.createdAt', 'DESC');

    if (filters.category) {
        query.andWhere('gig.category = :category', { category: filters.category });
    }
    
    // Additional filters can be added here (location, budget range, etc.)

    const total = await query.getCount();
    const data = await query
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Gig> {
    const gig = await this.gigRepository.findOne({
      where: { id },
      relations: ['client'],
    });

    if (!gig) {
      throw new NotFoundException('Gig not found');
    }

    return gig;
  }

  async update(id: string, userId: string, dto: UpdateGigDto): Promise<Gig> {
    const gig = await this.findOne(id);

    if (gig.clientId !== userId) {
      throw new ForbiddenException('You can only update your own gigs');
    }

    Object.assign(gig, dto);
    return this.gigRepository.save(gig);
  }

  async delete(id: string, userId: string): Promise<void> {
    const gig = await this.findOne(id);

    if (gig.clientId !== userId) {
      throw new ForbiddenException('You can only delete your own gigs');
    }

    await this.gigRepository.remove(gig);
  }

  // Proposals

  async submitProposal(gigId: string, userId: string, dto: CreateProposalDto): Promise<Proposal> {
      const gig = await this.findOne(gigId);
      
      if (gig.clientId === userId) {
          throw new BadRequestException('Cannot submit proposal to your own gig');
      }
      
      if (gig.status !== GigStatus.ACTIVE) {
          throw new BadRequestException('Gig is not active');
      }

      const existing = await this.proposalRepository.findOne({
          where: { gigId, providerId: userId }
      });
      
      if (existing) {
          throw new BadRequestException('You have already submitted a proposal for this gig');
      }

      const proposal = this.proposalRepository.create({
          ...dto,
          gigId,
          providerId: userId,
      } as Proposal);

      await this.proposalRepository.save(proposal);
      
      // Increment proposal count
      await this.gigRepository.increment({ id: gigId }, 'proposalCount', 1);

      return proposal;
  }
  
  async getMyProposals(userId: string): Promise<Proposal[]> {
      return this.proposalRepository.find({
          where: { providerId: userId },
          relations: ['gig'],
          order: { createdAt: 'DESC' }
      });
  }
  
  async getProposal(id: string, userId: string): Promise<Proposal> {
      const proposal = await this.proposalRepository.findOne({
          where: { id },
          relations: ['gig', 'gig.client', 'provider']
      });
      
      if (!proposal) {
          throw new NotFoundException('Proposal not found');
      }
      
      // Only the provider who sent it or the client who owns the gig can view
      if (proposal.providerId !== userId && proposal.gig.clientId !== userId) {
          throw new ForbiddenException('Access denied');
      }
      
      return proposal;
  }
}
