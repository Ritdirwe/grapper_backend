import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportReason, ReportStatus } from '../../domain/value-objects/moderation-enums.vo';

export class CreateReportDto {
  @ApiProperty({ example: 'post' })
  @IsString()
  targetType: string;

  @ApiProperty({ example: 'uuid-of-target' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiProperty({ example: 'This post contains hate speech.', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class ResolveReportDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ example: 'Target post has been removed.', required: false, maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  resolutionNotes?: string;
}

export class ReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty()
  targetType: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty({ enum: ReportReason })
  reason: ReportReason;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiProperty({ required: false })
  resolvedById?: string;

  @ApiProperty({ required: false })
  resolutionNotes?: string;

  @ApiProperty({ required: false })
  resolvedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SystemStatsDto {
  @ApiProperty()
  users: {
    total: number;
    active: number;
    newToday: number;
  };
  @ApiProperty()
  services: {
    total: number;
    active: number;
  };
  @ApiProperty()
  revenue: {
    total: number;
    today: number;
    thisMonth: number;
  };
  @ApiProperty()
  activity: {
    posts: number;
    bookings: number;
    reports: number;
  };
}
