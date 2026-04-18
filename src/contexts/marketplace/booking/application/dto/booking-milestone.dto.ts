import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MilestoneStatus } from '../../domain/value-objects/booking-enums.vo';

export class CreateBookingMilestoneDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ minimum: 0.01, maximum: 100 })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  percent: number;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ProposeBookingMilestonesDto {
  @ApiProperty({ type: [CreateBookingMilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingMilestoneDto)
  milestones: CreateBookingMilestoneDto[];
}

export class UploadBookingMilestoneEvidenceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  externalUrl?: string;
}

export class BookingMilestoneEvidenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  milestoneId: string;

  @ApiProperty()
  uploadedBy: string;

  @ApiProperty()
  storagePath: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty({ required: false })
  note?: string;

  @ApiProperty({ required: false })
  externalUrl?: string;

  @ApiProperty()
  createdAt: Date;
}

export class BookingMilestoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  percent: number;

  @ApiProperty()
  estimatedAmount: number;

  @ApiProperty({ enum: MilestoneStatus })
  status: MilestoneStatus;

  @ApiProperty({ required: false })
  sortOrder?: number;

  @ApiProperty({ required: false })
  submittedAt?: Date;

  @ApiProperty({ required: false })
  approvedAt?: Date;

  @ApiProperty({ required: false })
  rejectedAt?: Date;

  @ApiProperty({ required: false })
  rejectionReason?: string;

  @ApiProperty()
  evidenceCount: number;

  @ApiProperty({ required: false, type: [BookingMilestoneEvidenceResponseDto] })
  evidences?: BookingMilestoneEvidenceResponseDto[];
}
