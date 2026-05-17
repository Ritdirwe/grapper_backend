
import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewType } from '../../domain/entities/review.entity';

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  serviceId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty()
  @IsString()
  comment: string;

  @ApiProperty({ enum: ReviewType, required: false })
  @IsOptional()
  reviewType?: ReviewType;
}

export class UpdateReviewDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ReviewAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class ReviewServiceSummaryDto {
  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ReviewType })
  reviewType: ReviewType;

  @ApiProperty({ required: false })
  bookingId?: string;

  @ApiProperty()
  rating: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty({ required: false })
  response?: string;

  @ApiProperty()
  helpfulCount: number;

  @ApiProperty({ isArray: true })
  helpfulUserIds: string[];

  @ApiProperty({ required: false, type: ReviewAuthorDto })
  user?: ReviewAuthorDto;

  @ApiProperty({ required: false, type: ReviewServiceSummaryDto })
  service?: ReviewServiceSummaryDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ReviewListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class ReviewListResponseDto {
  @ApiProperty({ type: [ReviewResponseDto] })
  data: ReviewResponseDto[];

  @ApiProperty({ type: ReviewListMetaDto })
  meta: ReviewListMetaDto;
}
