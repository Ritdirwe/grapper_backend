import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutStatus } from '../../domain/entities/payout.entity';

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
  currency: string;
}
