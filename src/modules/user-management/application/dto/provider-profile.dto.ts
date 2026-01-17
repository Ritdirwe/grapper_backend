import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CertificationDto {
  @ApiProperty({ example: 'Full Stack Web Development' })
  name: string;
  @ApiProperty({ example: 'Udemy' })
  issuer: string;
  @ApiProperty({ example: 2023 })
  year: number;
  @ApiProperty({ example: 'https://cert.com/123', required: false })
  url?: string;
}

export class PortfolioItemDto {
  @ApiProperty({ example: 'E-commerce Website' })
  title: string;
  @ApiProperty({ example: 'A complete online store built with NestJS' })
  description: string;
  @ApiProperty({ example: 'https://example.com/project.jpg' })
  imageUrl: string;
  @ApiProperty({ example: 'https://github.com/project', required: false })
  projectUrl?: string;
}

export class UpdateProviderProfileDto {
  @ApiProperty({ example: 'Doe Tech Solutions', required: false })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ example: 'Providing high-quality software development services.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['JavaScript', 'NestJS', 'React'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  skills?: string[];

  @ApiProperty({ type: [CertificationDto], required: false })
  @IsArray()
  @IsOptional()
  certifications?: CertificationDto[];

  @ApiProperty({ example: 5, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  yearsOfExperience?: number;

  @ApiProperty({ type: [PortfolioItemDto], required: false })
  @IsArray()
  @IsOptional()
  portfolio?: PortfolioItemDto[];

  @ApiProperty({ example: 50, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 24, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(72)
  responseTimeHours?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiProperty({ example: { Monday: { start: '09:00', end: '17:00' } }, required: false })
  @IsObject()
  @IsOptional()
  availabilityHours?: Record<string, { start: string; end: string }>;
}

export class ProviderProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false })
  businessName?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ isArray: true, required: false })
  skills?: string[];

  @ApiProperty({ type: [CertificationDto], required: false })
  certifications?: CertificationDto[];

  @ApiProperty({ required: false })
  yearsOfExperience?: number;

  @ApiProperty({ type: [PortfolioItemDto], required: false })
  portfolio?: PortfolioItemDto[];

  @ApiProperty({ required: false })
  hourlyRate?: number;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  responseTimeHours?: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  totalJobs: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty({ required: false })
  availabilityHours?: Record<string, any>;

  @ApiProperty({ required: false })
  lastActiveAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
