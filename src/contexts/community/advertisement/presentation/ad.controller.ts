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
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdController {
  constructor(private readonly adService: AdService) {}

  @Get('feed')
  @Public()
  async getFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ data: AdResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.adService.getFeed(page, limit);
  }

  @Post()
  async createAd(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAdDto,
  ): Promise<AdResponseDto> {
    return this.adService.create(user.id, dto);
  }

  @Get()
  async getMyAds(@CurrentUser() user: AuthUser): Promise<AdResponseDto[]> {
    return this.adService.findAll(user.id);
  }

  @Get(':id')
  async getAd(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<AdResponseDto> {
    return this.adService.findById(id, user.id);
  }

  @Put(':id')
  async updateAd(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdDto,
  ): Promise<AdResponseDto> {
    return this.adService.update(id, user.id, dto);
  }

  @Delete(':id')
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
  async likeAd(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adService.likeAd(id, user.id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.adService.getComments(id);
  }

  @Post(':id/comments')
  async addComment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('content') content: string) {
    return this.adService.addComment(id, user.id, content);
  }
}
