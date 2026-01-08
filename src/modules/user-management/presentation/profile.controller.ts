import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ProfileService } from '../application/services/profile.service';
import { UpdateProfileDto, ProfileResponseDto } from '../application/dto/profile.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { Public } from '@common/decorators/public.decorator';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@CurrentUser() user: User): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Public()
  @Get(':userId')
  async getPublicProfile(@Param('userId') userId: string): Promise<ProfileResponseDto> {
    return this.profileService.getPublicProfile(userId);
  }
}
