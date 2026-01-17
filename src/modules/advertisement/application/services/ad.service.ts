import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { Advertisement } from '../../domain/entities/advertisement.entity';
import { AdImpression } from '../../domain/entities/ad-impression.entity';
import { AdClick } from '../../domain/entities/ad-click.entity';
import {
  CreateAdDto,
  UpdateAdDto,
  AdResponseDto,
  AdTrackDto,
} from '../dto/ad.dto';
import { AdStatus, AdType } from '../../domain/value-objects/ad-enums.vo';

@Injectable()
export class AdService {
  constructor(
    @InjectRepository(Advertisement)
    private adRepository: Repository<Advertisement>,
    @InjectRepository(AdImpression)
    private impressionRepository: Repository<AdImpression>,
    @InjectRepository(AdClick)
    private clickRepository: Repository<AdClick>,
  ) {}

  async create(userId: string, dto: CreateAdDto): Promise<AdResponseDto> {
    const ad = this.adRepository.create({
      userId,
      title: dto.title,
      content: dto.content,
      mediaUrls: dto.mediaUrls,
      ctaUrl: dto.ctaUrl,
      adType: dto.adType,
      budget: dto.budget,
      remainingBudget: dto.budget,
      costPerClick: dto.costPerClick || 0.1, // Default costs
      costPerImpression: dto.costPerImpression || 0.005,
      targetingRules: dto.targetingRules,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: AdStatus.ACTIVE, // Default to active for now
    });

    await this.adRepository.save(ad);
    return this.mapToResponseDto(ad);
  }

  async findAll(userId: string): Promise<AdResponseDto[]> {
    const ads = await this.adRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return ads.map(ad => this.mapToResponseDto(ad));
  }

  async findById(id: string, userId: string): Promise<AdResponseDto> {
    const ad = await this.adRepository.findOne({ where: { id } });

    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only view your own advertisements');
    }

    return this.mapToResponseDto(ad);
  }

  async update(id: string, userId: string, dto: UpdateAdDto): Promise<AdResponseDto> {
    const ad = await this.adRepository.findOne({ where: { id } });

    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only edit your own advertisements');
    }

    if (dto.title !== undefined) ad.title = dto.title;
    if (dto.content !== undefined) ad.content = dto.content;
    if (dto.mediaUrls !== undefined) ad.mediaUrls = dto.mediaUrls;
    if (dto.ctaUrl !== undefined) ad.ctaUrl = dto.ctaUrl;
    if (dto.status !== undefined) ad.status = dto.status;
    if (dto.budget !== undefined) {
      const budgetDiff = dto.budget - ad.budget;
      ad.budget = dto.budget;
      ad.remainingBudget += budgetDiff;
    }
    if (dto.targetingRules !== undefined) ad.targetingRules = dto.targetingRules;

    await this.adRepository.save(ad);
    return this.mapToResponseDto(ad);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id } });

    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only delete your own advertisements');
    }

    await this.adRepository.remove(ad);
  }

  async getRecommendedAds(userId: string, adType: AdType, limit = 5): Promise<AdResponseDto[]> {
    const now = new Date();
    
    // Very simple targeting for now: get active ads that still have budget
    const ads = await this.adRepository
      .createQueryBuilder('ad')
      .where('ad.status = :status', { status: AdStatus.ACTIVE })
      .andWhere('ad.remaining_budget > 0')
      .andWhere('ad.adType = :adType', { adType })
      .andWhere('ad.startDate <= :now', { now })
      .andWhere('(ad.endDate IS NULL OR ad.endDate >= :now)', { now })
      .orderBy('RANDOM()') // Shuffle for variety
      .take(limit)
      .getMany();

    return ads.map(ad => this.mapToResponseDto(ad));
  }

  async trackImpression(adId: string, viewerId: string | null, dto: AdTrackDto): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad || !ad.isActive()) return;

    const cost = Number(ad.costPerImpression);
    if (ad.deductBudget(cost)) {
      const impression = this.impressionRepository.create({
        adId,
        userId: viewerId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        cost,
      });

      ad.totalImpressions++;
      await Promise.all([
        this.impressionRepository.save(impression),
        this.adRepository.save(ad),
      ]);
    }
  }

  async trackClick(adId: string, clickerId: string | null, dto: AdTrackDto): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad || !ad.isActive()) return;

    const cost = Number(ad.costPerClick);
    if (ad.deductBudget(cost)) {
      const click = this.clickRepository.create({
        adId,
        userId: clickerId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        cost,
      });

      ad.totalClicks++;
      await Promise.all([
        this.clickRepository.save(click),
        this.adRepository.save(ad),
      ]);
    }
  }

  private mapToResponseDto(ad: Advertisement): AdResponseDto {
    return {
      id: ad.id,
      userId: ad.userId,
      title: ad.title,
      content: ad.content,
      mediaUrls: ad.mediaUrls,
      ctaUrl: ad.ctaUrl,
      adType: ad.adType,
      status: ad.status,
      budget: Number(ad.budget),
      remainingBudget: Number(ad.remainingBudget),
      totalImpressions: ad.totalImpressions,
      totalClicks: ad.totalClicks,
      totalLikes: ad.totalLikes,
      startDate: ad.startDate,
      endDate: ad.endDate,
      targetingRules: ad.targetingRules,
      createdAt: ad.createdAt,
      updatedAt: ad.updatedAt,
    };
  }
}
