import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum NotificationCategory {
  BOOKING = 'booking',
  PAYMENT = 'payment',
  MESSAGE = 'message',
  REVIEW = 'review',
  SYSTEM = 'system',
}

export class NotificationEventDto {
  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deepLink?: string;
}
