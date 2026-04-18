import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../../domain/entities/profile.entity';
import { ProviderProfile } from '../../domain/entities/provider-profile.entity';
import { UpdateProfileDto, ProfileResponseDto } from '../dto/profile.dto';
import { SubmitVerificationDto, VerificationResponseDto } from '../dto/verification.dto';
import { StripeService } from '@contexts/billing/payment/infrastructure/gateways/stripe.service';
import { VerificationRequest } from '../../domain/entities/verification-request.entity';
import { VerificationStatus } from '../../domain/value-objects/user-enums.vo';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(ProviderProfile)
    private providerRepository: Repository<ProviderProfile>,
    @InjectRepository(VerificationRequest)
    private verificationRepository: Repository<VerificationRequest>,
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
    const latestVerification = await this.getLatestVerification(profile.id);
    return this.mapToResponseDto(profile, latestVerification);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.getOrCreateProfile(userId);

    Object.assign(profile, dto);
    await this.profileRepository.save(profile);

    const latestVerification = await this.getLatestVerification(profile.id);
    return this.mapToResponseDto(profile, latestVerification);
  }

  async getPublicProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const latestVerification = await this.getLatestVerification(profile.id);
    return this.mapToResponseDto(profile, latestVerification);
  }

  async submitVerification(
    userId: string,
    dto: SubmitVerificationDto,
  ): Promise<VerificationResponseDto> {
    if (!dto.credentialData && (!dto.documentUrls || dto.documentUrls.length === 0)) {
      throw new BadRequestException('Provide credentialData or at least one document URL');
    }

    const profile = await this.getOrCreateProfile(userId);

    const pendingRequest = await this.verificationRepository.findOne({
      where: { userId, status: VerificationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (pendingRequest) {
      throw new BadRequestException('A verification request is already pending review');
    }

    const verification = this.verificationRepository.create({
      userId,
      profileId: profile.id,
      status: VerificationStatus.PENDING,
      credentialType: dto.credentialType,
      credentialData: dto.credentialData,
      documentUrls: dto.documentUrls,
      submittedAt: new Date(),
    });

    const saved = await this.verificationRepository.save(verification);

    profile.verificationStatus = VerificationStatus.PENDING;
    await this.profileRepository.save(profile);

    return this.mapVerificationToDto(saved);
  }

  async getVerificationHistory(userId: string): Promise<VerificationResponseDto[]> {
    const profile = await this.getOrCreateProfile(userId);
    const verifications = await this.verificationRepository.find({
      where: { profileId: profile.id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return verifications.map((verification) => this.mapVerificationToDto(verification));
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

  private mapToResponseDto(
    profile: Profile,
    latestVerification?: VerificationRequest,
    verificationHistory?: VerificationRequest[],
  ): ProfileResponseDto {
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
      university: profile.university,
      preferredSavedPaymentMethodId: profile.preferredSavedPaymentMethodId,
      socialLinks: profile.socialLinks,
      verificationStatus: profile.verificationStatus,
      isVerified: profile.isVerified(),
      strikeCount: profile.strikeCount,
      isFeatured: profile.isFeatured,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      latestVerification: latestVerification
        ? this.mapVerificationToDto(latestVerification)
        : undefined,
      verificationHistory: verificationHistory
        ? verificationHistory.map((verification) => this.mapVerificationToDto(verification))
        : undefined,
    };
  }

  private async getLatestVerification(profileId: string): Promise<VerificationRequest | undefined> {
    return this.verificationRepository.findOne({
      where: { profileId },
      order: { createdAt: 'DESC' },
    });
  }

  private mapVerificationToDto(verification: VerificationRequest): VerificationResponseDto {
    return {
      id: verification.id,
      userId: verification.userId,
      profileId: verification.profileId,
      status: verification.status,
      credentialType: verification.credentialType,
      credentialData: verification.credentialData,
      documentUrls: verification.documentUrls,
      submittedAt: verification.submittedAt,
      reviewedAt: verification.reviewedAt,
      reviewedBy: verification.reviewedBy,
      reviewNote: verification.reviewNote,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };
  }
}
