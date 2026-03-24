import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { PayoutProvider } from '../../domain/value-objects/user-enums.vo';

export class CreatePayoutMethodDto {
  @IsEnum(PayoutProvider)
  provider: PayoutProvider;

  @IsString()
  accountName: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;

  @IsString()
  @IsOptional()
  stripeAccountId?: string;

  @IsString()
  @IsOptional()
  paystackRecipientCode?: string;

  @IsString()
  @IsOptional()
  flutterwaveRecipientId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PayoutMethodResponseDto {
  id: string;
  userId: string;
  provider: PayoutProvider;
  accountName: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  currency?: string;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
