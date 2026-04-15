import { ApiProperty } from '@nestjs/swagger';

export class MobileDashboardCardDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  value: number;

  @ApiProperty({ enum: ['currency', 'count'] })
  kind: 'currency' | 'count';

  @ApiProperty({ required: false, example: 'NGN' })
  currency?: string;

  @ApiProperty({ required: false, example: 'N42,000' })
  formattedValue?: string;
}

export class MobileDashboardActivityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  subtitle: string;

  @ApiProperty({ required: false })
  amount?: number;

  @ApiProperty({ required: false })
  status?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  timeLabel: string;
}

export class MobileDashboardResponseDto {
  @ApiProperty({ enum: ['provider', 'client'] })
  role: 'provider' | 'client';

  @ApiProperty({ type: [MobileDashboardCardDto] })
  cards: MobileDashboardCardDto[];

  @ApiProperty({ type: [MobileDashboardActivityDto] })
  recentActivity: MobileDashboardActivityDto[];
}
