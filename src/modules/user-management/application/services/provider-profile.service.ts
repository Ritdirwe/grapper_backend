import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderProfile } from '../../domain/entities/provider-profile.entity';
import { Profile } from '../../domain/entities/profile.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { UserRole } from '../../../identity/domain/value-objects/user-role.vo';
import { VerificationStatus } from '../../domain/value-objects/user-enums.vo';
import {
  UpdateProviderProfileDto,
  ProviderProfileResponseDto,
} from '../dto/provider-profile.dto';

@Injectable()
export class ProviderProfileService {
  constructor(
    @InjectRepository(ProviderProfile)
    private providerProfileRepository: Repository<ProviderProfile>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getOrCreateProviderProfile(userId: string): Promise<ProviderProfile> {
    let providerProfile = await this.providerProfileRepository.findOne({
      where: { userId },
    });

    if (!providerProfile) {
      // Upgrade user to provider role if not already
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user && user.role === UserRole.USER) {
        user.role = UserRole.PROVIDER;
        await this.userRepository.save(user);
      }

      providerProfile = this.providerProfileRepository.create({ userId });
      await this.providerProfileRepository.save(providerProfile);
    }

    return providerProfile;
  }

  async getProviderProfile(userId: string): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.getOrCreateProviderProfile(userId);
    return this.mapToResponseDto(providerProfile);
  }

  async updateProviderProfile(
    userId: string,
    dto: UpdateProviderProfileDto,
  ): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.getOrCreateProviderProfile(userId);

    Object.assign(providerProfile, dto);
    providerProfile.lastActiveAt = new Date();
    await this.providerProfileRepository.save(providerProfile);

    return this.mapToResponseDto(providerProfile);
  }

  async getPublicProviderProfile(userId: string): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.providerProfileRepository.findOne({
      where: { userId },
    });

    if (!providerProfile) {
      throw new NotFoundException('Provider profile not found');
    }

    return this.mapToResponseDto(providerProfile);
  }

  async addPortfolioItem(
    userId: string,
    item: { title: string; description: string; imageUrl: string; projectUrl?: string },
  ): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.getOrCreateProviderProfile(userId);

    if (!providerProfile.portfolio) {
      providerProfile.portfolio = [];
    }

    providerProfile.portfolio.push(item);
    await this.providerProfileRepository.save(providerProfile);

    return this.mapToResponseDto(providerProfile);
  }

  async removePortfolioItem(userId: string, index: number): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.getOrCreateProviderProfile(userId);

    if (providerProfile.portfolio && providerProfile.portfolio[index]) {
      providerProfile.portfolio.splice(index, 1);
      await this.providerProfileRepository.save(providerProfile);
    }

    return this.mapToResponseDto(providerProfile);
  }

  async addCertification(
    userId: string,
    certification: { name: string; issuer: string; year: number; url?: string },
  ): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.getOrCreateProviderProfile(userId);

    if (!providerProfile.certifications) {
      providerProfile.certifications = [];
    }

    providerProfile.certifications.push(certification);
    await this.providerProfileRepository.save(providerProfile);

    return this.mapToResponseDto(providerProfile);
  }

  async updateAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<ProviderProfileResponseDto> {
    const providerProfile = await this.getOrCreateProviderProfile(userId);

    providerProfile.isAvailable = isAvailable;
    providerProfile.lastActiveAt = new Date();
    await this.providerProfileRepository.save(providerProfile);

    return this.mapToResponseDto(providerProfile);
  }

  async searchProviders(query: {
    skills?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    isAvailable?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProviderProfileResponseDto[]; total: number }> {
    const { skills, minRating, maxHourlyRate, isAvailable, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Use simple find options instead of query builder to avoid TypeORM issues
    const where: any = {};

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    if (minRating) {
      where.averageRating = { $gte: minRating };
    }

    if (maxHourlyRate) {
      where.hourlyRate = { $lte: maxHourlyRate };
    }

    if (skills && skills.length > 0) {
      where.skills = { $overlap: skills };
    }

    const [providers, total] = await this.providerProfileRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        averageRating: 'DESC',
        totalReviews: 'DESC',
      },
    });

    return {
      data: providers.map(p => this.mapToResponseDto(p)),
      total,
    };
  }

  async searchProvidersWithUser(query: {
    skills?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    isAvailable?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: (ProviderProfile & { user?: User })[]; total: number }> {
    const { skills, minRating, maxHourlyRate, isAvailable, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    if (minRating) {
      where.averageRating = { $gte: minRating };
    }

    if (maxHourlyRate) {
      where.hourlyRate = { $lte: maxHourlyRate };
    }

    if (skills && skills.length > 0) {
      where.skills = { $overlap: skills };
    }

    const [providers, total] = await this.providerProfileRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        averageRating: 'DESC',
        totalReviews: 'DESC',
      },
      relations: ['user', 'user.profile'],
    });

    return {
      data: providers,
      total,
    };
  }

  private mapToResponseDto(profile: ProviderProfile): ProviderProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      businessName: profile.businessName,
      description: profile.description,
      skills: profile.skills,
      certifications: profile.certifications,
      yearsOfExperience: profile.yearsOfExperience,
      portfolio: profile.portfolio,
      hourlyRate: profile.hourlyRate,
      currency: profile.currency,
      responseTimeHours: profile.responseTimeHours,
      completionRate: profile.completionRate,
      totalEarnings: profile.totalEarnings,
      totalJobs: profile.totalJobs,
      averageRating: profile.averageRating,
      totalReviews: profile.totalReviews,
      isAvailable: profile.isAvailable,
      availabilityHours: profile.availabilityHours,
      lastActiveAt: profile.lastActiveAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
