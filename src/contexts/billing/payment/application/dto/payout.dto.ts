import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  IsUUID,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutStatus } from '../../domain/entities/payout.entity';
import {
  PayoutReleaseMode,
  PayoutReleaseSourceType,
} from '../../domain/entities/payout-release.entity';
import { PaymentGateway } from '../../domain/value-objects/payment-enums.vo';

export class CreatePayoutDto {
  @ApiProperty({ example: 10000, description: 'Amount in minor unit (e.g. kobo)', minimum: 1000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ example: 'uuid-of-payout-method', required: false })
  @IsString()
  @IsOptional()
  payoutMethodId?: string;
}

export class PayoutResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty({ required: false })
  payoutMethodId?: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PayoutStatus })
  status: PayoutStatus;

  @ApiProperty({ required: false })
  gatewayReference?: string;

  @ApiProperty({ required: false })
  processedAt?: Date;

  @ApiProperty({ required: false })
  failedAt?: Date;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty({ required: false })
  payoutMethod?: {
    id: string;
    provider: string;
    accountName: string;
    accountNumber?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProviderBalanceDto {
  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  availableBalance: number;

  @ApiProperty()
  pendingPayouts: number;

  @ApiProperty()
  completedPayouts: number;

  @ApiProperty()
  releasedAmount: number;

  @ApiProperty()
  currency: string;
}

export class VerifyPayoutAccountDto {
  @ApiProperty({ enum: PaymentGateway, example: PaymentGateway.PAYSTACK })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty()
  @IsString()
  accountNumber: string;

  @ApiProperty()
  @IsString()
  bankCode: string;
}

export class CreatePayoutReleaseDto {
  @ApiProperty()
  @IsUUID()
  providerId: string;

  @ApiProperty({ enum: PayoutReleaseSourceType })
  @IsEnum(PayoutReleaseSourceType)
  sourceType: PayoutReleaseSourceType;

  @ApiProperty()
  @IsUUID()
  sourceId: string;

  @ApiProperty({ enum: PayoutReleaseMode })
  @IsEnum(PayoutReleaseMode)
  releaseMode: PayoutReleaseMode;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PayoutReleaseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty({ enum: PayoutReleaseSourceType })
  sourceType: PayoutReleaseSourceType;

  @ApiProperty()
  sourceId: string;

  @ApiProperty({ enum: PayoutReleaseMode })
  releaseMode: PayoutReleaseMode;

  @ApiProperty({ required: false })
  milestoneId?: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ required: false })
  progressPercent?: number;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  releasedBy: string;

  @ApiProperty()
  createdAt: Date;
}
