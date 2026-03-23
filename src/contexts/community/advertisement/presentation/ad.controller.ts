import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AdService } from '../application/services/ad.service';
import {
  CreateAdDto,
  UpdateAdDto,
  AdResponseDto,
} from '../application/dto/ad.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@Controller('ads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdController {
  constructor(private readonly adService: AdService) {}

  @Get('feed')
  @Public()
  @Permissions(PERMISSIONS.COMMUNITY_AD_READ_FEED)
  async getFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ data: AdResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.adService.getFeed(page, limit);
  }

  @Post()
  @Permissions(PERMISSIONS.COMMUNITY_AD_MANAGE_OWN)
  async createAd(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAdDto,
  ): Promise<AdResponseDto> {
    return this.adService.create(user.id, dto);
  }

  @Get()
  @Permissions(PERMISSIONS.COMMUNITY_AD_MANAGE_OWN)
  async getMyAds(@CurrentUser() user: AuthUser): Promise<AdResponseDto[]> {
    return this.adService.findAll(user.id);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.COMMUNITY_AD_MANAGE_OWN)
  async getAd(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<AdResponseDto> {
    return this.adService.findById(id, user.id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.COMMUNITY_AD_MANAGE_OWN)
  async updateAd(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdDto,
  ): Promise<AdResponseDto> {
    return this.adService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMUNITY_AD_MANAGE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAd(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.adService.delete(id, user.id);
  }

  // Social interactions matching mobile expectations
  // Note: If mobile expects 'ads' prefix, we might need a separate controller or route alias.
  // For now adding them here.
  
  @Post(':id/like')
  @Permissions(PERMISSIONS.COMMUNITY_AD_INTERACT)
  async likeAd(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adService.likeAd(id, user.id);
  }

  @Get(':id/comments')
  @Permissions(PERMISSIONS.COMMUNITY_AD_INTERACT)
  async getComments(@Param('id') id: string) {
    return this.adService.getComments(id);
  }

  @Post(':id/comments')
  @Permissions(PERMISSIONS.COMMUNITY_AD_INTERACT)
  async addComment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('content') content: string) {
    return this.adService.addComment(id, user.id, content);
  }
}
