
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

export class ReviewResponseDto {
    // ... DTO structure if using auto-mapping, but typically entities are returned or mapped manually
}
