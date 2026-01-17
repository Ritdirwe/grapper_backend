import {
  IsString,
  IsOptional,
  IsDate,
  IsNumber,
  IsObject,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../domain/value-objects/booking-enums.vo';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsString()
  serviceId: string;

  @ApiProperty({ example: '2023-12-25T10:00:00Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledDate?: Date;

  @ApiProperty({ example: '10:00 AM', required: false })
  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({ example: 'Please arrive 10 minutes early.', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '123 Main St, New York, NY', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: { color: 'blue' }, required: false })
  @IsObject()
  @IsOptional()
  requirements?: Record<string, any>;
}

export class UpdateBookingDto {
  @ApiProperty({ example: '2023-12-25T11:00:00Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledDate?: Date;

  @ApiProperty({ example: '11:00 AM', required: false })
  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({ example: 'Updated notes.', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '456 Second St, New York, NY', required: false })
  @IsString()
  @IsOptional()
  location?: string;
}

export class CancelBookingDto {
  @ApiProperty({ example: 'Conflict of schedule' })
  @IsString()
  reason: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ required: false })
  scheduledDate?: Date;

  @ApiProperty({ required: false })
  scheduledTime?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false })
  requirements?: Record<string, any>;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ required: false })
  confirmedAt?: Date;

  @ApiProperty({ required: false })
  startedAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  cancelledAt?: Date;

  @ApiProperty({ required: false })
  cancellationReason?: string;

  @ApiProperty({ required: false })
  cancelledBy?: string;

  @ApiProperty({ required: false })
  service?: {
    id: string;
    title: string;
    slug: string;
  };

  @ApiProperty({ required: false })
  customer?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };

  @ApiProperty({ required: false })
  provider?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };

  @ApiProperty({ required: false })
  referenceCode?: string;

  @ApiProperty({ required: false })
  depositAmount?: number;

  @ApiProperty({ required: false })
  platformFee?: number;

  @ApiProperty()
  depositPaid: boolean;

  @ApiProperty()
  finalPaymentPaid: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
