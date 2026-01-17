import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ServiceService } from '../application/services/service.service';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Discovery')
@Controller()
export class DiscoveryController {
  constructor(private readonly serviceService: ServiceService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized service recommendations for the current user' })
  async getRecommendations(@CurrentUser() user: User) {
    // Basic implementation: return most ordered services for now
    return this.serviceService.search({
      limit: 10,
      sortBy: 'orders' as any,
      sortOrder: 'desc',
    });
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get trending services or posts' })
  @ApiQuery({ name: 'type', enum: ['services', 'posts'], default: 'services' })
  async getTrending(@Query('type') type: string = 'services') {
    if (type === 'services') {
      return this.serviceService.search({
        limit: 10,
        sortBy: 'rating' as any,
        sortOrder: 'desc',
      });
    }
    // TODO: Implement trending posts
    return [];
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Global search across services and profiles' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', enum: ['services', 'profiles', 'all'], default: 'all' })
  async search(
    @Query('q') q: string,
    @Query('type') type: string = 'all',
  ) {
    const results: any = {};
    
    if (type === 'services' || type === 'all') {
      results.services = await this.serviceService.search({ search: q, limit: 10 });
    }
    
    // Profiles search would be implemented in ProfileService
    // results.profiles = ...

    return results;
  }
}
