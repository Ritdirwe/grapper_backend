import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../../domain/entities/profile.entity';
import { ProviderProfile } from '../../domain/entities/provider-profile.entity';
import { UpdateProfileDto, ProfileResponseDto } from '../dto/profile.dto';
import { StripeService } from '../../../payment/infrastructure/gateways/stripe.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(ProviderProfile)
    private providerRepository: Repository<ProviderProfile>,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
  ) {}

  async getOrCreateProfile(userId: string): Promise<Profile> {
    let profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.profileRepository.create({ userId });
      await this.profileRepository.save(profile);
    }

    return profile;
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.getOrCreateProfile(userId);
    return this.mapToResponseDto(profile);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.getOrCreateProfile(userId);

    Object.assign(profile, dto);
    await this.profileRepository.save(profile);

    return this.mapToResponseDto(profile);
  }

  async getPublicProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapToResponseDto(profile);
  }

  async setupStripeConnect(userId: string) {
    let provider = await this.providerRepository.findOne({ where: { userId } });
    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    if (!provider.stripeAccountId) {
      const email = await this.getUserEmail(userId);
      const account = await this.stripeService.createConnectAccount(userId, email);
      provider.stripeAccountId = account.id;
      await this.providerRepository.save(provider);
    }

    return this.getStripeOnboardingLink(userId);
  }

  async getStripeOnboardingLink(userId: string) {
    const provider = await this.providerRepository.findOne({ where: { userId } });
    if (!provider || !provider.stripeAccountId) {
      throw new BadRequestException('Stripe account not initialized');
    }

    const link = await this.stripeService.createAccountLink(
      provider.stripeAccountId,
      'http://localhost:3000/api/profiles/stripe-refresh', // TODO: use config
      'http://localhost:3000/api/profiles/stripe-return',
    );

    return { url: link.url };
  }

  async getVerificationStatus(userId: string) {
    const provider = await this.providerRepository.findOne({ where: { userId } });
    if (!provider || !provider.stripeAccountId) {
      return { status: 'none' };
    }

    const account = await this.stripeService.getAccount(provider.stripeAccountId);
    if (account.details_submitted && !provider.stripeOnboardingComplete) {
      provider.stripeOnboardingComplete = true;
      await this.providerRepository.save(provider);
    }

    return {
      onboardingComplete: provider.stripeOnboardingComplete,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  private async getUserEmail(userId: string): Promise<string> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    return profile?.user?.email || '';
  }

  private mapToResponseDto(profile: Profile): ProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverImageUrl: profile.coverImageUrl,
      birthdate: profile.birthdate,
      gender: profile.gender,
      location: profile.location,
      country: profile.country,
      city: profile.city,
      website: profile.website,
      socialLinks: profile.socialLinks,
      verificationStatus: profile.verificationStatus,
      isVerified: profile.isVerified(),
      strikeCount: profile.strikeCount,
      isFeatured: profile.isFeatured,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
