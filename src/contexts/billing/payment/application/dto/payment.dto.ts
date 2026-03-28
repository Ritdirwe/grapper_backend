import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, PaymentGateway } from '../../domain/value-objects/payment-enums.vo';

export class InitializePaymentDto {
  @ApiProperty({ example: 5000, description: 'Amount in minor unit (e.g. kobo for NGN)', minimum: 100 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ example: 'NGN', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 'uuid-of-order', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ example: 'uuid-of-booking', required: false })
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiProperty({ example: 'Payment for Logo Design', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: PaymentGateway, required: false })
  @IsEnum(PaymentGateway)
  @IsOptional()
  gateway?: PaymentGateway;

  @ApiProperty({ required: false, description: 'Gateway-specific initialization payload' })
  @IsObject()
  @IsOptional()
  gatewayData?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'T123456789' })
  @IsString()
  reference: string;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ enum: PaymentGateway })
  gateway: PaymentGateway;

  @ApiProperty({ required: false })
  gatewayReference?: string;

  @ApiProperty({ required: false })
  orderId?: string;

  @ApiProperty({ required: false })
  bookingId?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty({ required: false })
  failedAt?: Date;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaymentInitializationResponseDto {
  @ApiProperty()
  reference: string;

  @ApiProperty({ required: false })
  authorizationUrl?: string;

  @ApiProperty({ required: false })
  clientSecret?: string;

  @ApiProperty({ required: false })
  accessCode?: string;

  @ApiProperty({ required: false, enum: PaymentGateway })
  processor?: PaymentGateway;

  @ApiProperty({ required: false, enum: ['redirect', 'sdk', 'embedded'] })
  mode?: 'redirect' | 'sdk' | 'embedded';

  @ApiProperty({ required: false, description: 'Public/publishable key for active gateway SDK' })
  publicKey?: string;
}
