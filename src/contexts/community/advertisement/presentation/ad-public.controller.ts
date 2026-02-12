import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Ip,
  HttpCode,
} from '@nestjs/common';
import { AdService } from '../application/services/ad.service';
import { AdResponseDto, AdTrackDto } from '../application/dto/ad.dto';
import { AdType } from '../domain/value-objects/ad-enums.vo';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';

@Controller('public/ads')
export class AdPublicController {
  constructor(private readonly adService: AdService) {}

  @Get('serve')
  async serveAds(
    @Query('type') type: AdType,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthUser,
  ): Promise<AdResponseDto[]> {
    return this.adService.getRecommendedAds(user?.id, type || AdType.SPONSORED_POST, limit);
  }

  @Post(':id/impression')
  @HttpCode(204)
  async trackImpression(
    @Param('id') id: string,
    @Ip() ip: string,
    @Req() req: any,
    @CurrentUser() user?: AuthUser,
  ): Promise<void> {
    const dto: AdTrackDto = {
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    };
    return this.adService.trackImpression(id, user?.id || null, dto);
  }

  @Post(':id/click')
  @HttpCode(204)
  async trackClick(
    @Param('id') id: string,
    @Ip() ip: string,
    @Req() req: any,
    @CurrentUser() user?: AuthUser,
  ): Promise<void> {
    const dto: AdTrackDto = {
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    };
    return this.adService.trackClick(id, user?.id || null, dto);
  }
}
