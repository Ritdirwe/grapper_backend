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

export class UpdateProviderProfileDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsOptional()
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number;
    url?: string;
  }>;

  @IsNumber()
  @IsOptional()
  @Min(0)
  yearsOfExperience?: number;

  @IsArray()
  @IsOptional()
  portfolio?: Array<{
    title: string;
    description: string;
    imageUrl: string;
    projectUrl?: string;
  }>;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(72)
  responseTimeHours?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsObject()
  @IsOptional()
  availabilityHours?: Record<string, { start: string; end: string }>;
}

export class ProviderProfileResponseDto {
  id: string;
  userId: string;
  businessName?: string;
  description?: string;
  skills?: string[];
  certifications?: any[];
  yearsOfExperience?: number;
  portfolio?: any[];
  hourlyRate?: number;
  currency?: string;
  responseTimeHours?: number;
  completionRate: number;
  totalEarnings: number;
  totalJobs: number;
  averageRating: number;
  totalReviews: number;
  isAvailable: boolean;
  availabilityHours?: Record<string, any>;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
