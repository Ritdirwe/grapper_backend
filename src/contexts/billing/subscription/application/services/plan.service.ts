import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../../domain/entities/subscription-plan.entity';
import {
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
} from '../dto/subscription.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(dto: CreatePlanDto): Promise<PlanResponseDto> {
    const existing = await this.planRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Plan with this name already exists');
    }

    const plan = this.planRepository.create({
      name: dto.name,
      description: dto.description,
      tier: dto.tier,
      price: dto.price,
      currency: dto.currency || 'NGN',
      billingInterval: dto.billingInterval,
      trialDays: dto.trialDays || 0,
      features: dto.features,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      isPopular: dto.isPopular || false,
    });

    await this.planRepository.save(plan);
    return this.mapToResponseDto(plan);
  }

  async findAll(includeInactive = false): Promise<PlanResponseDto[]> {
    const query = this.planRepository.createQueryBuilder('plan');

    if (!includeInactive) {
      query.where('plan.is_active = :isActive', { isActive: true });
    }

    const plans = await query
      .orderBy('plan.sort_order', 'ASC')
      .addOrderBy('plan.price', 'ASC')
      .getMany();

    return plans.map((plan) => this.mapToResponseDto(plan));
  }

  async findById(id: string): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return this.mapToResponseDto(plan);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (dto.name && dto.name !== plan.name) {
      const existing = await this.planRepository.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new BadRequestException('Plan with this name already exists');
      }
    }

    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.description !== undefined) plan.description = dto.description;
    if (dto.price !== undefined) plan.price = dto.price;
    if (dto.trialDays !== undefined) plan.trialDays = dto.trialDays;
    if (dto.features !== undefined) plan.features = dto.features;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;
    if (dto.isPopular !== undefined) plan.isPopular = dto.isPopular;

    await this.planRepository.save(plan);
    return this.mapToResponseDto(plan);
  }

  async delete(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    plan.isActive = false;
    await this.planRepository.save(plan);
  }

  private mapToResponseDto(plan: SubscriptionPlan): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      tier: plan.tier,
      price: plan.price,
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      trialDays: plan.trialDays,
      features: plan.features,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      monthlyPrice: plan.getMonthlyPrice(),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
