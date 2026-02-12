import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisputeReason } from '../../domain/value-objects/booking-enums.vo';

export class CreateDisputeDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: DisputeReason })
  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @ApiProperty({ example: 'The service was not as described.', minLength: 10 })
  @IsString()
  description: string;

  @ApiProperty({ example: ['https://example.com/evidence1.jpg'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  evidence?: string[];
}

export class ResolveDisputeDto {
  @ApiProperty({ example: 'Refund issued to the customer.' })
  @IsString()
  resolution: string;

  @ApiProperty({ example: 50.0, required: false })
  @IsOptional()
  refundAmount?: number;

  @ApiProperty({ example: 'Internal admin notes about the case.', required: false })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class DisputeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  raisedBy: string;

  @ApiProperty({ enum: DisputeReason })
  reason: DisputeReason;

  @ApiProperty()
  description: string;

  @ApiProperty({ isArray: true, required: false })
  evidence?: string[];

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty({ required: false })
  resolution?: string;

  @ApiProperty({ required: false })
  resolvedAt?: Date;

  @ApiProperty({ required: false })
  resolvedBy?: string;

  @ApiProperty({ required: false })
  refundAmount?: number;

  @ApiProperty({ required: false })
  order?: {
    orderNumber: string;
    amount: number;
  };

  @ApiProperty({ required: false })
  raiser?: {
    id: string;
    displayName?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
