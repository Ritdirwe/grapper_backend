
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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewService } from '../application/services/review.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewResponseDto,
  ReviewListResponseDto,
} from '../application/dto/review.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';

@ApiTags('Service Reviews')
@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review for a service' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto): Promise<ReviewResponseDto> {
    return this.reviewService.create(user.id, dto);
  }

  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get reviews for a service' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: ReviewListResponseDto })
  async getServiceReviews(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ReviewListResponseDto> {
    return this.reviewService.findAllByService(serviceId, page, limit);
  }
  
  @Get('received')
  @ApiOperation({ summary: 'Get reviews received by current provider' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: ReviewListResponseDto })
  async getReceivedReviews(
      @CurrentUser() user: AuthUser,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
  ): Promise<ReviewListResponseDto> {
      return this.reviewService.getReviewsReceived(user.id, page, limit);
  }

  @Get('written')
  @ApiOperation({ summary: 'Get reviews written by current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: ReviewListResponseDto })
  async getWrittenReviews(
      @CurrentUser() user: AuthUser,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
  ): Promise<ReviewListResponseDto> {
      return this.reviewService.getMyReviews(user.id, page, limit);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204 })
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.reviewService.delete(id, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a review (Provider only)' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('response') response: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.respond(id, user.id, response);
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async markHelpful(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.markHelpful(id, user.id);
  }
}
