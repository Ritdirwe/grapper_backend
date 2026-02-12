import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Profile } from '../../domain/entities/profile.entity';
import {
  ProfileReadContract,
  ProfileSummary,
} from '@shared/contracts/profile-read.contract';

@Injectable()
export class ProfileReadService implements ProfileReadContract {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async getProfileByUserId(userId: string): Promise<ProfileSummary | undefined> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!profile) {
      return undefined;
    }

    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    };
  }

  async getProfilesByUserIds(userIds: string[]): Promise<ProfileSummary[]> {
    if (userIds.length === 0) {
      return [];
    }

    const profiles = await this.profileRepository.find({
      where: { userId: In(userIds) },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return profiles.map((profile) => ({
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    }));
  }
}
