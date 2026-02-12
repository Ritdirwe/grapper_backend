import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  IsUrl,
  IsObject,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceStatus, PricingType, DeliveryType } from '../../domain/value-objects/service-enums.vo';

export class ServiceFaqDto {
  @ApiProperty({ example: 'What is the turnaround time?' })
  question: string;
  @ApiProperty({ example: 'Usually 2-3 business days.' })
  answer: string;
}

export class ServiceImageDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  imageUrl: string;
  @ApiProperty({ example: 'Front view', required: false })
  caption?: string;
  @ApiProperty()
  isPrimary: boolean;
}

export class CreateServiceDto {
  @ApiProperty({ example: 'Professional Web Development', minLength: 5, maxLength: 100 })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Detailed description of the web development service...', minLength: 50 })
  @IsString()
  @MinLength(50)
  description: string;

  @ApiProperty({ example: 'High-quality web development', required: false, maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  shortDescription?: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: PricingType, required: false })
  @IsEnum(PricingType)
  @IsOptional()
  pricingType?: PricingType;

  @ApiProperty({ enum: DeliveryType, required: false })
  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @ApiProperty({ example: 2, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationHours?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationDays?: number;

  @ApiProperty({ example: ['web', 'react', 'nodejs'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: ['Responsive Design', 'SEO Optimized'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: ['Access to hosting', 'Logo files'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  requirements?: string[];

  @ApiProperty({ type: [ServiceFaqDto], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  faqs?: ServiceFaqDto[];

  @ApiProperty({ example: 'https://example.com/cover.jpg', required: false })
  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({ example: 'Remote', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: ['Worldwide'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  serviceArea?: string[];
}

export class UpdateServiceDto {
  @ApiProperty({ example: 'Professional Web Development', required: false })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(100)
  title?: string;

  @ApiProperty({ example: 'Detailed description of the web development service...', required: false })
  @IsString()
  @IsOptional()
  @MinLength(50)
  description?: string;

  @ApiProperty({ example: 'High-quality web development', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  shortDescription?: string;

  @ApiProperty({ example: 'uuid-of-category', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 49.99, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: PricingType, required: false })
  @IsEnum(PricingType)
  @IsOptional()
  pricingType?: PricingType;

  @ApiProperty({ enum: DeliveryType, required: false })
  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @ApiProperty({ example: 2, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationHours?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationDays?: number;

  @ApiProperty({ enum: ServiceStatus, required: false })
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;

  @ApiProperty({ isArray: true, required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ isArray: true, required: false })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiProperty({ isArray: true, required: false })
  @IsArray()
  @IsOptional()
  requirements?: string[];

  @ApiProperty({ type: [ServiceFaqDto], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  faqs?: ServiceFaqDto[];

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ isArray: true, required: false })
  @IsArray()
  @IsOptional()
  serviceArea?: string[];
}

export class ServiceQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, description: 'Category ID (UUID)' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false, description: 'Category name (e.g., Research Tools)' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  providerId?: string;

  @ApiProperty({ enum: ServiceStatus, required: false })
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  minRating?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 20, required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ enum: ['price', 'rating', 'orders', 'newest'], required: false })
  @IsString()
  @IsOptional()
  sortBy?: 'price' | 'rating' | 'orders' | 'newest';

  @ApiProperty({ enum: ['asc', 'desc'], required: false })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class ServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  shortDescription?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PricingType })
  pricingType: PricingType;

  @ApiProperty({ enum: DeliveryType })
  deliveryType: DeliveryType;

  @ApiProperty({ required: false })
  durationHours?: number;

  @ApiProperty({ required: false })
  durationDays?: number;

  @ApiProperty({ enum: ServiceStatus })
  status: ServiceStatus;

  @ApiProperty({ isArray: true, required: false })
  tags?: string[];

  @ApiProperty({ isArray: true, required: false })
  features?: string[];

  @ApiProperty({ isArray: true, required: false })
  requirements?: string[];

  @ApiProperty({ type: [ServiceFaqDto], isArray: true, required: false })
  faqs?: ServiceFaqDto[];

  @ApiProperty({ required: false })
  coverImageUrl?: string;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  isPromoted: boolean;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ isArray: true, required: false })
  serviceArea?: string[];

  @ApiProperty({ type: [ServiceImageDto], isArray: true, required: false })
  images?: ServiceImageDto[];

  @ApiProperty({ required: false })
  provider?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
    averageRating?: number;
  };

  @ApiProperty({ required: false })
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
