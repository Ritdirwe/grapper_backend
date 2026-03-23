import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { ProviderProfileService } from '../application/services/provider-profile.service';
import {
  UpdateProviderProfileDto,
  ProviderProfileResponseDto,
  PortfolioItemDto,
  CertificationDto,
} from '../application/dto/provider-profile.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { User } from '../../domain/entities/user.entity';
import { PERMISSIONS } from '@common/authz/permissions.enum';

class UpdateAvailabilityDto {
  @ApiProperty() isAvailable: boolean;
}

@ApiTags('Provider Profiles')
@Controller('provider-profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProviderProfileController {
  constructor(private readonly providerProfileService: ProviderProfileService) {}

  @ApiBearerAuth()
  @Get('me')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_PROFILE_READ_SELF)
  @ApiOperation({ summary: 'Get current user provider profile' })
  @ApiResponse({ status: 200, type: ProviderProfileResponseDto })
  async getMyProviderProfile(@CurrentUser() user: User): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.getProviderProfile(user.id);
  }

  @ApiBearerAuth()
  @Put('me')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_PROFILE_UPDATE_SELF)
  @ApiOperation({ summary: 'Update current user provider profile' })
  @ApiResponse({ status: 200, type: ProviderProfileResponseDto })
  async updateMyProviderProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProviderProfileDto,
  ): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.updateProviderProfile(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('me/portfolio')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_PORTFOLIO_MANAGE_SELF)
  @ApiOperation({ summary: 'Add an item to portfolio' })
  @ApiResponse({ status: 201, type: ProviderProfileResponseDto })
  async addPortfolioItem(
    @CurrentUser() user: User,
    @Body() item: PortfolioItemDto,
  ): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.addPortfolioItem(user.id, item);
  }

  @ApiBearerAuth()
  @Delete('me/portfolio/:index')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_PORTFOLIO_MANAGE_SELF)
  @ApiOperation({ summary: 'Remove an item from portfolio' })
  @ApiResponse({ status: 200, type: ProviderProfileResponseDto })
  async removePortfolioItem(
    @CurrentUser() user: User,
    @Param('index') index: string,
  ): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.removePortfolioItem(user.id, parseInt(index, 10));
  }

  @ApiBearerAuth()
  @Post('me/certifications')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_CERTIFICATION_MANAGE_SELF)
  @ApiOperation({ summary: 'Add a certification' })
  @ApiResponse({ status: 201, type: ProviderProfileResponseDto })
  async addCertification(
    @CurrentUser() user: User,
    @Body() certification: CertificationDto,
  ): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.addCertification(user.id, certification);
  }

  @ApiBearerAuth()
  @Put('me/availability')
  @Permissions(PERMISSIONS.IDENTITY_PROVIDER_AVAILABILITY_UPDATE_SELF)
  @ApiOperation({ summary: 'Update availability status' })
  @ApiResponse({ status: 200, type: ProviderProfileResponseDto })
  async updateAvailability(
    @CurrentUser() user: User,
    @Body() body: UpdateAvailabilityDto,
  ): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.updateAvailability(user.id, body.isAvailable);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search for service providers' })
  @ApiQuery({ name: 'skills', required: false, description: 'Comma-separated list of skills' })
  @ApiQuery({ name: 'minRating', required: false })
  @ApiQuery({ name: 'maxHourlyRate', required: false })
  @ApiQuery({ name: 'isAvailable', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchProviders(
    @Query('skills') skills?: string,
    @Query('minRating') minRating?: string,
    @Query('maxHourlyRate') maxHourlyRate?: string,
    @Query('isAvailable') isAvailable?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.providerProfileService.searchProviders({
      skills: skills ? skills.split(',') : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxHourlyRate: maxHourlyRate ? parseFloat(maxHourlyRate) : undefined,
      isAvailable: isAvailable ? isAvailable === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Public()
  @Get(':userId')
  @ApiOperation({ summary: 'Get public provider profile' })
  @ApiResponse({ status: 200, type: ProviderProfileResponseDto })
  async getPublicProviderProfile(
    @Param('userId') userId: string,
  ): Promise<ProviderProfileResponseDto> {
    return this.providerProfileService.getPublicProviderProfile(userId);
  }
}
