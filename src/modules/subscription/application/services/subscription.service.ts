import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../domain/entities/subscription.entity';
import { SubscriptionPlan } from '../../domain/entities/subscription-plan.entity';
import {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
} from '../dto/subscription.dto';
import { SubscriptionStatus, BillingInterval } from '../../domain/value-objects/subscription-enums.vo';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(userId: string, dto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    // Check if user already has an active subscription
    const existing = await this.subscriptionRepository.findOne({
      where: { 
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Get plan
    const plan = await this.planRepository.findOne({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.isActive) {
      throw new BadRequestException('This plan is no longer available');
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, plan.billingInterval);

    // Create subscription
    const subscription = this.subscriptionRepository.create({
      userId,
      planId: plan.id,
      status: plan.hasTrialPeriod() ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    // Set trial period if applicable
    if (plan.hasTrialPeriod()) {
      subscription.trialStart = now;
      subscription.trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
    }

    await this.subscriptionRepository.save(subscription);

    return this.findById(subscription.id, userId);
  }

  async findById(id: string, userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You can only view your own subscriptions');
    }

    return this.mapToResponseDto(subscription);
  }

  async findByUser(userId: string): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      return null;
    }

    return this.mapToResponseDto(subscription);
  }

  async cancel(id: string, userId: string, dto: CancelSubscriptionDto): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own subscriptions');
    }

    if (subscription.isCanceled()) {
      throw new BadRequestException('Subscription is already canceled');
    }

    subscription.cancel(dto.immediately || false);
    await this.subscriptionRepository.save(subscription);

    return this.findById(id, userId);
  }

  async renew(id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const newPeriodEnd = this.calculatePeriodEnd(
      subscription.currentPeriodEnd,
      subscription.plan.billingInterval,
    );

    subscription.renew(newPeriodEnd);
    await this.subscriptionRepository.save(subscription);

    return this.mapToResponseDto(subscription);
  }

  private calculatePeriodEnd(startDate: Date, interval: BillingInterval): Date {
    const end = new Date(startDate);

    switch (interval) {
      case BillingInterval.DAY:
        end.setDate(end.getDate() + 1);
        break;
      case BillingInterval.WEEK:
        end.setDate(end.getDate() + 7);
        break;
      case BillingInterval.MONTH:
        end.setMonth(end.getMonth() + 1);
        break;
      case BillingInterval.YEAR:
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return end;
  }

  private mapToResponseDto(subscription: Subscription): SubscriptionResponseDto {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      canceledAt: subscription.canceledAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      plan: subscription.plan ? {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description,
        tier: subscription.plan.tier,
        price: subscription.plan.price,
        currency: subscription.plan.currency,
        billingInterval: subscription.plan.billingInterval,
        trialDays: subscription.plan.trialDays,
        features: subscription.plan.features,
        isActive: subscription.plan.isActive,
        isPopular: subscription.plan.isPopular,
        monthlyPrice: subscription.plan.getMonthlyPrice(),
        createdAt: subscription.plan.createdAt,
        updatedAt: subscription.plan.updatedAt,
      } : undefined,
      daysRemaining,
      isTrialing: subscription.isTrialing(),
    };
  }
}
