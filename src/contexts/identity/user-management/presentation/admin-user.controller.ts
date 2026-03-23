import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminUserService } from '../application/services/admin-user.service';
import {
  AdminUpdateUserDto,
  AdminUpdateProfileDto,
  AdminUserListQueryDto,
  AdminUserResponseDto,
  AdminVerificationListQueryDto,
  AdminReviewVerificationDto,
  AdminVerificationResponseDto,
  AdminAssignRoleDto,
  AdminSetPrimaryRoleDto,
  AdminUserRoleAssignmentResponseDto,
} from '../application/dto/admin-user.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { UserRole } from '../../domain/value-objects/user-role.vo';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Admin User Management')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @Permissions(PERMISSIONS.OPS_USER_MANAGEMENT_READ)
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async getAllUsers(
    @Query() query: AdminUserListQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    return this.adminUserService.getAllUsers(query);
  }

  @Get('verifications')
  @Permissions(PERMISSIONS.OPS_USER_VERIFICATION_QUEUE_READ)
  @ApiOperation({ summary: 'Get verification queue with optional filters' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async getVerificationQueue(
    @Query() query: AdminVerificationListQueryDto,
  ): Promise<PaginatedResponseDto<AdminVerificationResponseDto>> {
    return this.adminUserService.getVerificationQueue(query);
  }

  @Get(':userId')
  @Permissions(PERMISSIONS.OPS_USER_MANAGEMENT_READ)
  @ApiOperation({ summary: 'Get detailed user info by ID' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async getUserById(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.getUserById(userId);
  }

  @Get(':userId/roles')
  @Permissions(PERMISSIONS.OPS_USER_ROLE_READ)
  @ApiOperation({ summary: 'Get assigned roles for a specific user' })
  @ApiResponse({ status: 200, type: [AdminUserRoleAssignmentResponseDto] })
  async getUserRoles(
    @Param('userId') userId: string,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    return this.adminUserService.getUserRoleAssignments(userId);
  }

  @Post(':userId/roles')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.OPS_USER_ROLE_ASSIGN)
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({ status: 200, type: [AdminUserRoleAssignmentResponseDto] })
  async assignRole(
    @CurrentUser() admin: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminAssignRoleDto,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    return this.adminUserService.assignRole(userId, admin.id, dto);
  }

  @Delete(':userId/roles/:role')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.OPS_USER_ROLE_ASSIGN)
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiResponse({ status: 200, type: [AdminUserRoleAssignmentResponseDto] })
  async removeRole(
    @Param('userId') userId: string,
    @Param('role') role: UserRole,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    return this.adminUserService.removeRole(userId, role);
  }

  @Put(':userId/roles/primary')
  @Permissions(PERMISSIONS.OPS_USER_ROLE_ASSIGN)
  @ApiOperation({ summary: 'Set primary role for a user' })
  @ApiResponse({ status: 200, type: [AdminUserRoleAssignmentResponseDto] })
  async setPrimaryRole(
    @Param('userId') userId: string,
    @Body() dto: AdminSetPrimaryRoleDto,
  ): Promise<AdminUserRoleAssignmentResponseDto[]> {
    return this.adminUserService.setPrimaryRole(userId, dto);
  }

  @Get(':userId/verifications')
  @Permissions(PERMISSIONS.OPS_USER_VERIFICATION_QUEUE_READ)
  @ApiOperation({ summary: 'Get verification history for a specific user' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async getUserVerifications(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResponseDto<AdminVerificationResponseDto>> {
    return this.adminUserService.getUserVerifications(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('verifications/:verificationId/review')
  @Permissions(PERMISSIONS.OPS_USER_VERIFICATION_REVIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review verification request (approve/reject)' })
  @ApiResponse({ status: 200, type: AdminVerificationResponseDto })
  async reviewVerification(
    @CurrentUser() admin: AuthUser,
    @Param('verificationId') verificationId: string,
    @Body() dto: AdminReviewVerificationDto,
  ): Promise<AdminVerificationResponseDto> {
    return this.adminUserService.reviewVerification(verificationId, admin.id, dto);
  }

  @Put(':userId')
  @Permissions(PERMISSIONS.OPS_USER_MANAGEMENT_UPDATE)
  @ApiOperation({ summary: 'Update user core data (role, status)' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.updateUser(userId, dto);
  }

  @Put(':userId/profile')
  @Permissions(PERMISSIONS.OPS_USER_MANAGEMENT_UPDATE)
  @ApiOperation({ summary: 'Update user profile (strikes, verification)' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateProfileDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.updateProfile(userId, dto);
  }

  @Post(':userId/suspend')
  @Permissions(PERMISSIONS.OPS_USER_STATUS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async suspendUser(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.suspendUser(userId);
  }

  @Post(':userId/ban')
  @Permissions(PERMISSIONS.OPS_USER_STATUS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async banUser(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.banUser(userId);
  }

  @Post(':userId/activate')
  @Permissions(PERMISSIONS.OPS_USER_STATUS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a suspended or banned user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async activateUser(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.activateUser(userId);
  }

  @Post(':userId/verify')
  @Permissions(PERMISSIONS.OPS_USER_VERIFICATION_REVIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually verify a user profile' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async verifyProfile(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.verifyProfile(userId);
  }

  @Post(':userId/reject-verification')
  @Permissions(PERMISSIONS.OPS_USER_VERIFICATION_REVIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a user verification request' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async rejectVerification(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.rejectVerification(userId);
  }

  @Post(':userId/strikes/add')
  @Permissions(PERMISSIONS.OPS_USER_STRIKE_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a strike to a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async addStrike(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.addStrike(userId);
  }

  @Post(':userId/strikes/remove')
  @Permissions(PERMISSIONS.OPS_USER_STRIKE_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a strike from a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async removeStrike(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.removeStrike(userId);
  }

  @Post(':userId/strikes/reset')
  @Permissions(PERMISSIONS.OPS_USER_STRIKE_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all strikes for a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async resetStrikes(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.resetStrikes(userId);
  }

  @Post(':userId/toggle-featured')
  @Permissions(PERMISSIONS.OPS_USER_FEATURED_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle user featured status' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async toggleFeatured(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.toggleFeatured(userId);
  }
}
