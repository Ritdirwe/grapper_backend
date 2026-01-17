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
} from '@nestjs/common';
import { AdService } from '../application/services/ad.service';
import {
  CreateAdDto,
  UpdateAdDto,
  AdResponseDto,
} from '../application/dto/ad.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';

@Controller('advertisements')
@UseGuards(JwtAuthGuard)
export class AdController {
  constructor(private readonly adService: AdService) {}

  @Post()
  async createAd(
    @CurrentUser() user: User,
    @Body() dto: CreateAdDto,
  ): Promise<AdResponseDto> {
    return this.adService.create(user.id, dto);
  }

  @Get()
  async getMyAds(@CurrentUser() user: User): Promise<AdResponseDto[]> {
    return this.adService.findAll(user.id);
  }

  @Get(':id')
  async getAd(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<AdResponseDto> {
    return this.adService.findById(id, user.id);
  }

  @Put(':id')
  async updateAd(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAdDto,
  ): Promise<AdResponseDto> {
    return this.adService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAd(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.adService.delete(id, user.id);
  }
}
