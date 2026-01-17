import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingInterval, PlanTier, SubscriptionStatus } from '../../domain/value-objects/subscription-enums.vo';

// Plan DTOs
export class CreatePlanDto {
  @ApiProperty({ example: 'Premium Plan', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Unlimited access to all features', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: PlanTier })
  @IsEnum(PlanTier)
  tier: PlanTier;

  @ApiProperty({ example: 2999, description: 'Price in minor unit (e.g. cents/kobo)' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'NGN', required: false, maxLength: 3 })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: BillingInterval })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @ApiProperty({ example: 14, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @ApiProperty({ example: { features: ['Ads-free', 'Priority Support'] }, required: false })
  @IsObject()
  @IsOptional()
  features?: Record<string, any>;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;
}

export class UpdatePlanDto {
  @ApiProperty({ example: 'Updated Plan Name', required: false, maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'New description here', required: false, maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 3499, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({ example: 30, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @ApiProperty({ example: { updated_features: true }, required: false })
  @IsObject()
  @IsOptional()
  features?: Record<string, any>;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;
}

export class PlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: PlanTier })
  tier: PlanTier;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: BillingInterval })
  billingInterval: BillingInterval;

  @ApiProperty()
  trialDays: number;

  @ApiProperty({ required: false })
  features?: Record<string, any>;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isPopular: boolean;

  @ApiProperty()
  monthlyPrice: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Subscription DTOs
export class CreateSubscriptionDto {
  @ApiProperty({ example: 'uuid-of-plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({ example: 'uuid-of-payment-method', required: false })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

export class CancelSubscriptionDto {
  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  immediately?: boolean;

  @ApiProperty({ example: 'Too expensive', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  currentPeriodStart: Date;

  @ApiProperty()
  currentPeriodEnd: Date;

  @ApiProperty({ required: false })
  trialStart?: Date;

  @ApiProperty({ required: false })
  trialEnd?: Date;

  @ApiProperty({ required: false })
  canceledAt?: Date;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  plan?: PlanResponseDto;

  @ApiProperty({ required: false })
  daysRemaining?: number;

  @ApiProperty({ required: false })
  isTrialing?: boolean;
}
