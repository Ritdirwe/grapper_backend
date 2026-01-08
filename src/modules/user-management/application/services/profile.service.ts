import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../../domain/entities/profile.entity';
import { UpdateProfileDto, ProfileResponseDto } from '../dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
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
