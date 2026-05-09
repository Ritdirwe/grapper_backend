import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@common/guards/optional-jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ServiceService } from '../application/services/service.service';
import { ProviderProfileService } from '@contexts/identity/user-management/application/services/provider-profile.service';
import { Public } from '@common/decorators/public.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import { PostService } from '@contexts/community/social/application/services/post.service';

@ApiTags('Discovery')
@Controller()
export class DiscoveryController {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly providerProfileService: ProviderProfileService,
    private readonly postService: PostService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized service recommendations for the current user' })
  @Permissions(PERMISSIONS.MARKETPLACE_DISCOVERY_PERSONALIZED_READ)
  async getRecommendations(@CurrentUser() user?: AuthUser) {
    // Basic implementation: return most ordered services for now
    return this.serviceService.search({
      limit: 10,
      sortBy: 'orders' as any,
      sortOrder: 'desc',
    }, user?.id);
  }

  @Public()
  @Get('recommendations/providers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get recommended providers based on rating and availability' })
  async getProviderRecommendations(@CurrentUser() user?: AuthUser) {
    const result = await this.providerProfileService.searchProvidersWithUser({
      isAvailable: true,
      page: 1,
      limit: 10,
    });

    // Transform to match frontend expected format with user profile data
    const providers = result.data.map(provider => ({
      id: provider.userId,
      full_name: provider.businessName || provider.user?.profile?.fullName || 'Provider',
      avatar_url: provider.user?.profile?.avatarUrl || null,
      isVerified: provider.user?.profile?.verificationStatus === 'verified',
      rating: provider.averageRating,
      reviews_count: provider.totalReviews,
      topService: null, // Could be enhanced to include top service
    }));

    return { providers };
  }

  @Public()
  @Get('trending')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get trending services or posts' })
  @ApiQuery({ name: 'type', enum: ['services', 'posts'], default: 'services' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'windowDays', required: false })
  async getTrending(
    @Query('type') type: string = 'services',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('windowDays') windowDays?: number,
    @CurrentUser() user?: AuthUser,
  ) {
    if (type === 'services') {
      return this.serviceService.search({
        limit: 10,
        sortBy: 'rating' as any,
        sortOrder: 'desc',
      }, user?.id);
    }

    return this.postService.getTrendingPosts({
      page,
      limit,
      windowDays,
    });
  }

  @Public()
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Global search across services and profiles' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', enum: ['services', 'profiles', 'all'], default: 'all' })
  async search(
    @Query('q') q: string,
    @Query('type') type: string = 'all',
    @CurrentUser() user?: AuthUser,
  ) {
    const results: any = {};
    
    if (type === 'services' || type === 'all') {
      results.services = await this.serviceService.search({ search: q, limit: 10 }, user?.id);
    }
    
    // Profiles search would be implemented in ProfileService
    // results.profiles = ...

    return results;
  }
}
