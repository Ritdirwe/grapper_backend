
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
import { CreateReviewDto, UpdateReviewDto } from '../application/dto/review.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';

@ApiTags('Service Reviews')
@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review for a service' })
  async create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, dto);
  }

  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get reviews for a service' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getServiceReviews(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.findAllByService(serviceId, page, limit);
  }
  
  @Get('received')
  @ApiOperation({ summary: 'Get reviews received by current provider' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getReceivedReviews(
      @CurrentUser() user: User,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
  ) {
      return this.reviewService.getReviewsReceived(user.id, page, limit);
  }

  @Get('written')
  @ApiOperation({ summary: 'Get reviews written by current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getWrittenReviews(
      @CurrentUser() user: User,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
  ) {
      return this.reviewService.getMyReviews(user.id, page, limit);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a review' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.reviewService.delete(id, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a review (Provider only)' })
  async respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('response') response: string,
  ) {
    return this.reviewService.respond(id, user.id, response);
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  async markHelpful(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.reviewService.markHelpful(id, user.id);
  }
}
