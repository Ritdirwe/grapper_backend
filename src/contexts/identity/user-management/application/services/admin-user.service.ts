import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { Profile } from '../../domain/entities/profile.entity';
import { VerificationRequest } from '../../domain/entities/verification-request.entity';
import { UserRole, UserStatus } from '../../../domain/value-objects/user-role.vo';
import { VerificationStatus } from '../../domain/value-objects/user-enums.vo';
import {
  AdminUpdateUserDto,
  AdminUpdateProfileDto,
  AdminAssignRoleDto,
  AdminSetPrimaryRoleDto,
  AdminUserListQueryDto,
  AdminUserResponseDto,
  AdminVerificationListQueryDto,
  AdminReviewVerificationDto,
  AdminVerificationResponseDto,
  AdminUserRoleAssignmentResponseDto,
} from '../dto/admin-user.dto';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';
import { PermissionsService } from '@common/authz/application/services/permissions.service';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(VerificationRequest)
    private verificationRepository: Repository<VerificationRequest>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getUserRoleAssignments(userId: string): Promise<AdminUserRoleAssignmentResponseDto[]> {
    const assignments = await this.permissionsService.getUserRoleAssignments(userId);
    return assignments.map((assignment) => this.mapRoleAssignmentResponseDto(assignment));
  }

  async assignRole(
    userId: string,
    adminId: string,
    dto: AdminAssignRoleDto,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    const assignments = await this.permissionsService.assignRoleToUser(
      userId,
      dto.role,
      adminId,
    );
    return assignments.map((assignment) => this.mapRoleAssignmentResponseDto(assignment));
  }

  async removeRole(
    userId: string,
    role: UserRole,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    const assignments = await this.permissionsService.removeRoleFromUser(userId, role);
    return assignments.map((assignment) => this.mapRoleAssignmentResponseDto(assignment));
  }

  async setPrimaryRole(
    userId: string,
    dto: AdminSetPrimaryRoleDto,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    const assignments = await this.permissionsService.setPrimaryRoleForUser(userId, dto.role);
    return assignments.map((assignment) => this.mapRoleAssignmentResponseDto(assignment));
  }

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
        'profile.university',
        'profile.verification_status',
        'profile.strike_count',
        'profile.is_featured',
      ]);

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR profile.full_name LIKE :search OR profile.display_name LIKE :search OR profile.university LIKE :search)',
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
      .orderBy('user.createdAt', 'DESC')
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

  async getUserVerifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponseDto<AdminVerificationResponseDto>> {
    const [verifications, total] = await this.verificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = verifications.map((verification) => this.mapVerificationResponseDto(verification));
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getVerificationQueue(
    query: AdminVerificationListQueryDto,
  ): Promise<PaginatedResponseDto<AdminVerificationResponseDto>> {
    const { status, userId, page = 1, limit = 20 } = query;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    const [verifications, total] = await this.verificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = verifications.map((verification) => this.mapVerificationResponseDto(verification));
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async reviewVerification(
    verificationId: string,
    adminId: string,
    dto: AdminReviewVerificationDto,
  ): Promise<AdminVerificationResponseDto> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    verification.status = dto.status;
    verification.reviewNote = dto.reviewNote;
    verification.reviewedBy = adminId;
    verification.reviewedAt = new Date();

    await this.verificationRepository.save(verification);

    const profile = await this.profileRepository.findOne({ where: { id: verification.profileId } });
    if (profile) {
      profile.verificationStatus = dto.status;
      if (dto.status === VerificationStatus.VERIFIED) {
        profile.verifiedAt = verification.reviewedAt;
      }
      if (dto.status === VerificationStatus.REJECTED) {
        profile.verifiedAt = null;
      }
      await this.profileRepository.save(profile);
    }

    return this.mapVerificationResponseDto(verification);
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
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            coverImageUrl: profile.coverImageUrl,
            location: profile.location,
            country: profile.country,
            city: profile.city,
            website: profile.website,
            university: profile.university,
            verificationStatus: profile.verificationStatus,
            strikeCount: profile.strikeCount,
            isFeatured: profile.isFeatured,
          }
        : undefined,
    };
  }

  private mapVerificationResponseDto(
    verification: VerificationRequest,
  ): AdminVerificationResponseDto {
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

  private mapRoleAssignmentResponseDto(
    assignment: { id: string; userId: string; roleKey: string; isPrimary: boolean; assignedBy?: string; createdAt: Date; updatedAt: Date },
  ): AdminUserRoleAssignmentResponseDto {
    return {
      id: assignment.id,
      userId: assignment.userId,
      role: assignment.roleKey as UserRole,
      isPrimary: assignment.isPrimary,
      assignedBy: assignment.assignedBy,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }
}
