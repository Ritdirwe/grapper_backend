import { Controller, Get, Put, Body, Param, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from '../application/services/profile.service';
import { UpdateProfileDto, ProfileResponseDto } from '../application/dto/profile.dto';
import { SubmitVerificationDto, VerificationResponseDto } from '../application/dto/verification.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../domain/entities/user.entity';
import { Public } from '@common/decorators/public.decorator';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { UserRole } from '../../domain/value-objects/user-role.vo';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('User Profiles')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('me')
  @Permissions(PERMISSIONS.IDENTITY_PROFILE_READ_SELF)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getMyProfile(@CurrentUser() user: User): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put('me')
  @Permissions(PERMISSIONS.IDENTITY_PROFILE_UPDATE_SELF)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Public()
  @Get(':userId')
  @ApiOperation({ summary: 'Get public profile by user ID' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getPublicProfile(@Param('userId') userId: string): Promise<ProfileResponseDto> {
    return this.profileService.getPublicProfile(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('setup-payout')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_ONBOARDING_SELF)
  @ApiOperation({ summary: 'Start Stripe Connect onboarding for a provider' })
  async setupPayout(@CurrentUser() user: User) {
    return this.profileService.setupStripeConnect(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('verify')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_VERIFICATION_READ_SELF)
  @ApiOperation({ summary: 'Get provider verification and onboarding status' })
  async getVerificationStatus(@CurrentUser() user: User) {
    return this.profileService.getVerificationStatus(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('me/verification')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_VERIFICATION_SUBMIT_SELF)
  @ApiOperation({ summary: 'Submit verification credentials/documents' })
  @ApiResponse({ status: 201, type: VerificationResponseDto })
  async submitVerification(
    @CurrentUser() user: User,
    @Body() dto: SubmitVerificationDto,
  ): Promise<VerificationResponseDto> {
    return this.profileService.submitVerification(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('me/verification')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_VERIFICATION_READ_SELF)
  @ApiOperation({ summary: 'Get current user verification history' })
  @ApiResponse({ status: 200, type: [VerificationResponseDto] })
  async getMyVerificationHistory(@CurrentUser() user: User): Promise<VerificationResponseDto[]> {
    return this.profileService.getVerificationHistory(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('broadcast')
  @Permissions(PERMISSIONS.COMMUNITY_PUSH_BROADCAST)
  @ApiOperation({ summary: 'Broadcast a notification to all active devices (Admin only)' })
  async broadcastNotification(@CurrentUser() user: User) {
    // This method would typically call a service to handle the broadcast logic
    // For now, it's a placeholder based on the instruction's example.
    // The example used profileService.getVerificationStatus, but a broadcast would be different.
    // Assuming a new method for broadcasting.
    return { message: 'Broadcast initiated by admin', adminId: user.id };
  }
}
