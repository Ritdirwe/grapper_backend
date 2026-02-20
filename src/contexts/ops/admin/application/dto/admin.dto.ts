import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsUUID,
  IsNumber,
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

  @ApiProperty()
  bookings: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    disputed: number;
  };

  @ApiProperty()
  payments: {
    totalTransactions: number;
    totalVolume: number;
    pendingPayouts: number;
    completedPayouts: number;
  };
}

export class AdminBookingListDto {
  @ApiProperty({ isArray: true })
  bookings: Record<string, unknown>[];

  @ApiProperty()
  total: number;
}

export class AdminPaymentListDto {
  @ApiProperty({ isArray: true })
  transactions: Record<string, unknown>[];

  @ApiProperty()
  total: number;
}

export class AdminDisputeListDto {
  @ApiProperty({ isArray: true })
  disputes: Record<string, unknown>[];

  @ApiProperty()
  total: number;
}

export class ResolveDisputeAdminDto {
  @ApiProperty({ example: 'Provider updated the deliverables and both parties agreed.' })
  @IsString()
  @MaxLength(1000)
  resolution: string;

  @ApiProperty({ required: false, example: 'Refund approved by admin.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  adminNotes?: string;

  @ApiProperty({ required: false, example: 1000 })
  @IsNumber()
  @IsOptional()
  refundAmount?: number;
}

export class OverviewTotalsDto {
  @ApiProperty()
  users: number;

  @ApiProperty()
  profiles: number;

  @ApiProperty()
  posts: number;

  @ApiProperty()
  comments: number;

  @ApiProperty()
  services: number;

  @ApiProperty()
  ads: number;

  @ApiProperty()
  bookings: number;

  @ApiProperty()
  activeSessions: number;
}

export class DailyCountPointDto {
  @ApiProperty()
  day: string;

  @ApiProperty()
  count: number;
}

export class DailySpendPointDto {
  @ApiProperty()
  day: string;

  @ApiProperty()
  spend: number;
}

export class TopUniversityPointDto {
  @ApiProperty()
  university: string;

  @ApiProperty()
  count: number;
}

export class AdminOverviewDto {
  @ApiProperty({ type: OverviewTotalsDto })
  totals: OverviewTotalsDto;

  @ApiProperty({ type: [DailyCountPointDto] })
  postsByDay: DailyCountPointDto[];

  @ApiProperty({ type: [DailyCountPointDto] })
  commentsByDay: DailyCountPointDto[];

  @ApiProperty({ type: [DailySpendPointDto] })
  spendByDay: DailySpendPointDto[];

  @ApiProperty({ type: [TopUniversityPointDto] })
  topUniversities: TopUniversityPointDto[];
}

export class RecountPostCommentsDto {
  @ApiProperty()
  updatedPosts: number;
}
