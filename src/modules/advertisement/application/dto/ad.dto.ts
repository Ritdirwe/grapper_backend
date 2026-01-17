import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsUrl,
  Min,
  MaxLength,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdStatus, AdType } from '../../domain/value-objects/ad-enums.vo';

export class CreateAdDto {
  @ApiProperty({ example: 'Summer Sale', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Get 50% off all services this summer!', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  content: string;

  @ApiProperty({ example: ['https://example.com/ad.jpg'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  mediaUrls?: string[];

  @ApiProperty({ example: 'https://example.com/sale' })
  @IsUrl()
  ctaUrl: string;

  @ApiProperty({ enum: AdType })
  @IsEnum(AdType)
  adType: AdType;

  @ApiProperty({ example: 10000, description: 'Total ad budget' })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({ example: 50, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costPerClick?: number;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  costPerImpression?: number;

  @ApiProperty({ example: { interests: ['Design', 'Tech'] }, required: false })
  @IsObject()
  @IsOptional()
  targetingRules?: {
    interests?: string[];
    locations?: string[];
    ageRange?: [number, number];
    userRoles?: string[];
  };

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-01-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class UpdateAdDto {
  @ApiProperty({ example: 'Flash Sale', required: false, maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Limited time offer!', required: false, maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  content?: string;

  @ApiProperty({ example: ['https://example.com/new-ad.jpg'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  mediaUrls?: string[];

  @ApiProperty({ example: 'https://example.com/flash', required: false })
  @IsUrl()
  @IsOptional()
  ctaUrl?: string;

  @ApiProperty({ enum: AdStatus, required: false })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;

  @ApiProperty({ example: 15000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @ApiProperty({ example: { locations: ['Lagos'] }, required: false })
  @IsObject()
  @IsOptional()
  targetingRules?: Record<string, any>;
}

export class AdResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ isArray: true, required: false })
  mediaUrls?: string[];

  @ApiProperty()
  ctaUrl: string;

  @ApiProperty({ enum: AdType })
  adType: AdType;

  @ApiProperty({ enum: AdStatus })
  status: AdStatus;

  @ApiProperty()
  budget: number;

  @ApiProperty()
  remainingBudget: number;

  @ApiProperty()
  totalImpressions: number;

  @ApiProperty()
  totalClicks: number;

  @ApiProperty()
  totalLikes: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  targetingRules?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdTrackDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
