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
import { ReviewService } from '../application/services/review.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewResponseDto,
  RespondToReviewDto,
} from '../application/dto/review.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Service Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Public()
  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get reviews for a specific service' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
  async getServiceReviews(
    @Param('serviceId') serviceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getServiceReviews(
      serviceId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions(PERMISSIONS.MARKETPLACE_REVIEW_CREATE)
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_REVIEW_UPDATE_OWN)
  @ApiOperation({ summary: 'Update an existing review' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_REVIEW_DELETE_OWN)
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200 })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.reviewService.delete(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/respond')
  @Permissions(PERMISSIONS.MARKETPLACE_REVIEW_RESPOND_PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a review (Provider only)' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondToReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.respond(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/helpful')
  @Permissions(PERMISSIONS.MARKETPLACE_REVIEW_MARK_HELPFUL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a review as helpful' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async markHelpful(@Param('id') id: string): Promise<ReviewResponseDto> {
    return this.reviewService.markHelpful(id);
  }
}
