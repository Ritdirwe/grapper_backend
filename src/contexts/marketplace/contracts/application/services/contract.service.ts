
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract, ContractStatus } from '../../domain/entities/contract.entity';
import { Milestone, MilestoneStatus } from '../../domain/entities/milestone.entity';
import { ContractFile } from '../../domain/entities/contract-file.entity';
import { Activity } from '../../domain/entities/activity.entity';
import { CreateContractDto, UpdateContractDto, CreateMilestoneDto, UpdateMilestoneDto } from '../dto/contract.dto';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    @InjectRepository(ContractFile)
    private contractFileRepository: Repository<ContractFile>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
  ) {}

  async create(userId: string, dto: CreateContractDto): Promise<Contract> {
    const contract = this.contractRepository.create({
      ...dto,
      clientId: userId,
      status: ContractStatus.DRAFT,
      milestones: dto.milestones ? dto.milestones.map(m => this.milestoneRepository.create(m)) : [],
    });

    await this.contractRepository.save(contract);
    await this.logActivity(contract.id, 'contract_created', 'Contract created');
    return this.findOne(contract.id, userId);
  }

  async findAll(userId: string): Promise<Contract[]> {
    return this.contractRepository.find({
      where: [
        { clientId: userId },
        { providerId: userId },
      ],
      relations: ['milestones', 'client', 'provider'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['milestones', 'files', 'activities', 'client', 'provider'],
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId !== userId && contract.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return contract;
  }

  async update(id: string, userId: string, dto: UpdateContractDto): Promise<Contract> {
    const contract = await this.findOne(id, userId);

    if (contract.status === ContractStatus.COMPLETED || contract.status === ContractStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a completed or cancelled contract');
    }

    Object.assign(contract, dto);
    await this.contractRepository.save(contract);
    
    if (dto.status) {
      await this.logActivity(id, 'status_change', `Status updated to ${dto.status}`);
    } else {
      await this.logActivity(id, 'contract_updated', 'Contract details updated');
    }

    return this.findOne(id, userId);
  }

  async addMilestone(id: string, userId: string, dto: CreateMilestoneDto): Promise<Milestone> {
    const contract = await this.findOne(id, userId);
    
    // Only allow adding milestones if contract is draft or pending
    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING) {
      throw new BadRequestException('Cannot add milestones to active or locked contracts');
    }

    const milestone = this.milestoneRepository.create({
      ...dto,
      contractId: id,
    });

    await this.milestoneRepository.save(milestone);
    await this.logActivity(id, 'milestone_added', `Milestone "${dto.title}" added`);
    
    return milestone;
  }

  async updateMilestone(contractId: string, milestoneId: string, userId: string, dto: UpdateMilestoneDto): Promise<Milestone> {
    const contract = await this.findOne(contractId, userId); // Permission check included
    
    const milestone = await this.milestoneRepository.findOne({ where: { id: milestoneId, contractId } });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    milestone.status = dto.status;
    await this.milestoneRepository.save(milestone);
    await this.logActivity(contractId, 'milestone_updated', `Milestone "${milestone.title}" status updated to ${dto.status}`);

    return milestone;
  }

  // Placeholder for file upload - assumes file handling is done in controller or another service
  // specific logic would involve StorageService.
  async addFile(contractId: string, userId: string, fileData: { name: string, url: string, type: string, size: number }): Promise<ContractFile> {
    // Check access
    await this.findOne(contractId, userId);

    const file = this.contractFileRepository.create({
      ...fileData,
      contractId,
    });
    
    await this.contractFileRepository.save(file);
    await this.logActivity(contractId, 'file_uploaded', `File "${fileData.name}" uploaded`);
    
    return file;
  }

  async getActivity(contractId: string, userId: string): Promise<Activity[]> {
    await this.findOne(contractId, userId); // Check permission
    return this.activityRepository.find({
      where: { contractId },
      order: { createdAt: 'DESC' },
    });
  }

  private async logActivity(contractId: string, type: string, description: string) {
    const activity = this.activityRepository.create({
      contractId,
      type,
      description,
    });
    await this.activityRepository.save(activity);
  }
}
