import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFollow } from '../../domain/entities/user-follow.entity';
import { Profile } from '../../domain/entities/profile.entity';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(UserFollow)
    private followRepository: Repository<UserFollow>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async follow(followerId: string, followingId: string): Promise<{ message: string }> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: followingId } });
    if (!targetUser) {
      throw new NotFoundException('User to follow not found');
    }

    const existing = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      throw new ConflictException('Already following this user');
    }

    const follow = this.followRepository.create({ followerId, followingId });
    await this.followRepository.save(follow);

    // Update follower/following counts
    await this.updateFollowCounts(followerId, followingId);

    return { message: 'Successfully followed user' };
  }

  async unfollow(followerId: string, followingId: string): Promise<{ message: string }> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.followRepository.remove(follow);

    // Update follower/following counts
    await this.updateFollowCounts(followerId, followingId);

    return { message: 'Successfully unfollowed user' };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowers(userId: string, page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [follows, total] = await this.followRepository.findAndCount({
      where: { followingId: userId },
      relations: ['follower'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const followerIds = follows.map(f => f.followerId);
    const profiles = await this.profileRepository.find({
      where: followerIds.map(id => ({ userId: id })),
    });

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return {
      data: follows.map(f => ({
        userId: f.followerId,
        followedAt: f.createdAt,
        profile: profileMap.get(f.followerId) || null,
      })),
      total,
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [follows, total] = await this.followRepository.findAndCount({
      where: { followerId: userId },
      relations: ['following'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const followingIds = follows.map(f => f.followingId);
    const profiles = await this.profileRepository.find({
      where: followingIds.map(id => ({ userId: id })),
    });

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return {
      data: follows.map(f => ({
        userId: f.followingId,
        followedAt: f.createdAt,
        profile: profileMap.get(f.followingId) || null,
      })),
      total,
    };
  }

  private async updateFollowCounts(followerId: string, followingId: string): Promise<void> {
    // Update follower's following count
    const followingCount = await this.followRepository.count({
      where: { followerId },
    });
    await this.profileRepository.update({ userId: followerId }, { followingCount });

    // Update following's followers count
    const followersCount = await this.followRepository.count({
      where: { followingId },
    });
    await this.profileRepository.update({ userId: followingId }, { followersCount });
  }
}
