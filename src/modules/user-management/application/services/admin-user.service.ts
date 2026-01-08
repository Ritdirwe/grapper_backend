import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../../identity/domain/entities/user.entity';
import { Profile } from '../../domain/entities/profile.entity';
import { UserRole, UserStatus } from '../../../identity/domain/value-objects/user-role.vo';
import { VerificationStatus } from '../../domain/value-objects/user-enums.vo';
import {
  AdminUpdateUserDto,
  AdminUpdateProfileDto,
  AdminUserListQueryDto,
  AdminUserResponseDto,
} from '../dto/admin-user.dto';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async getAllUsers(
    query: AdminUserListQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    const { search, role, status, verificationStatus, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.refreshTokens', 'tokens')
      .leftJoin('profiles', 'profile', 'profile.user_id = user.id')
      .addSelect([
        'profile.id',
        'profile.full_name',
        'profile.display_name',
        'profile.verification_status',
        'profile.strike_count',
        'profile.is_featured',
      ]);

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR profile.full_name LIKE :search OR profile.display_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (verificationStatus) {
      queryBuilder.andWhere('profile.verification_status = :verificationStatus', {
        verificationStatus,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const users = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.created_at', 'DESC')
      .getMany();

    // Get profiles separately for users
    const userIds = users.map(u => u.id);
    const profiles = await this.profileRepository.find({
      where: userIds.map(id => ({ userId: id })),
    });

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    const data = users.map(user => this.mapToAdminResponseDto(user, profileMap.get(user.id)));

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getUserById(userId: string): Promise<AdminUserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    return this.mapToAdminResponseDto(user, profile);
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto): Promise<AdminUserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent demoting the last admin
    if (dto.role && user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last admin');
      }
    }

    Object.assign(user, dto);
    await this.userRepository.save(user);

    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    return this.mapToAdminResponseDto(user, profile);
  }

  async updateProfile(
    userId: string,
    dto: AdminUpdateProfileDto,
  ): Promise<AdminUserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.profileRepository.create({ userId });
    }

    Object.assign(profile, dto);

    // Set verified_at if status changed to verified
    if (dto.verificationStatus === VerificationStatus.VERIFIED && !profile.verifiedAt) {
      profile.verifiedAt = new Date();
    }

    await this.profileRepository.save(profile);

    return this.mapToAdminResponseDto(user, profile);
  }

  async suspendUser(userId: string): Promise<AdminUserResponseDto> {
    return this.updateUser(userId, { status: UserStatus.SUSPENDED });
  }

  async banUser(userId: string): Promise<AdminUserResponseDto> {
    return this.updateUser(userId, { status: UserStatus.BANNED });
  }

  async activateUser(userId: string): Promise<AdminUserResponseDto> {
    return this.updateUser(userId, { status: UserStatus.ACTIVE });
  }

  async verifyProfile(userId: string): Promise<AdminUserResponseDto> {
    return this.updateProfile(userId, {
      verificationStatus: VerificationStatus.VERIFIED,
    });
  }

  async rejectVerification(userId: string): Promise<AdminUserResponseDto> {
    return this.updateProfile(userId, {
      verificationStatus: VerificationStatus.REJECTED,
    });
  }

  async addStrike(userId: string): Promise<AdminUserResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.incrementStrike();
    await this.profileRepository.save(profile);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.mapToAdminResponseDto(user, profile);
  }

  async removeStrike(userId: string): Promise<AdminUserResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (profile.strikeCount > 0) {
      profile.strikeCount -= 1;
      await this.profileRepository.save(profile);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.mapToAdminResponseDto(user, profile);
  }

  async resetStrikes(userId: string): Promise<AdminUserResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.resetStrikes();
    await this.profileRepository.save(profile);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.mapToAdminResponseDto(user, profile);
  }

  async toggleFeatured(userId: string): Promise<AdminUserResponseDto> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.isFeatured = !profile.isFeatured;
    await this.profileRepository.save(profile);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.mapToAdminResponseDto(user, profile);
  }

  private mapToAdminResponseDto(user: User, profile?: Profile): AdminUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: profile
        ? {
            fullName: profile.fullName,
            displayName: profile.displayName,
            verificationStatus: profile.verificationStatus,
            strikeCount: profile.strikeCount,
            isFeatured: profile.isFeatured,
          }
        : undefined,
    };
  }
}
