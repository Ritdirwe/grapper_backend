import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsString()
  serviceId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Excellent service, highly recommended!', required: false, maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @ApiProperty({ example: ['https://example.com/rev1.jpg'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 'uuid-of-booking', required: false })
  @IsString()
  @IsOptional()
  bookingId?: string;
}

export class UpdateReviewDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({ example: 'Good service, but could be faster.', required: false, maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @ApiProperty({ isArray: true, required: false })
  @IsArray()
  @IsOptional()
  images?: string[];
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  reviewerId: string;

  @ApiProperty({ required: false })
  bookingId?: string;

  @ApiProperty()
  rating: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty({ isArray: true, required: false })
  images?: string[];

  @ApiProperty({ required: false })
  providerResponse?: string;

  @ApiProperty({ required: false })
  providerResponseAt?: Date;

  @ApiProperty()
  isVerifiedPurchase: boolean;

  @ApiProperty()
  helpfulCount: number;

  @ApiProperty()
  isHidden: boolean;

  @ApiProperty({ required: false })
  reviewer?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RespondToReviewDto {
  @ApiProperty({ example: 'Thank you for your feedback!', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  response: string;
}
