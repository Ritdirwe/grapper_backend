import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketSenderRole,
  SupportTicketStatus,
} from '../../domain/value-objects/support-ticket-enums.vo';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportTicketCategory })
  @IsEnum(SupportTicketCategory)
  category: SupportTicketCategory;

  @ApiProperty({ required: false, example: 'uuid-or-reference-of-target-resource' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  targetId?: string;

  @ApiProperty({ example: 'Payment was deducted but order is still pending', maxLength: 180 })
  @IsString()
  @MinLength(6)
  @MaxLength(180)
  subject: string;

  @ApiProperty({ example: 'I completed checkout but transaction succeeded without updating my order.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: SupportTicketPriority, required: false, default: SupportTicketPriority.NORMAL })
  @IsEnum(SupportTicketPriority)
  @IsOptional()
  priority?: SupportTicketPriority;
}

export class AddSupportTicketMessageDto {
  @ApiProperty({ example: 'Please share your transaction reference so we can verify your payment.' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;

  @ApiProperty({ required: false, isArray: true, example: ['https://example.com/evidence.png'] })
  @IsOptional()
  attachments?: string[];

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  isInternalNote?: boolean;
}

export class UpdateSupportTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus })
  @IsEnum(SupportTicketStatus)
  status: SupportTicketStatus;
}

export class SupportTicketQueryDto {
  @ApiProperty({ required: false, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, enum: SupportTicketStatus })
  @IsEnum(SupportTicketStatus)
  @IsOptional()
  status?: SupportTicketStatus;

  @ApiProperty({ required: false, enum: SupportTicketCategory })
  @IsEnum(SupportTicketCategory)
  @IsOptional()
  category?: SupportTicketCategory;

  @ApiProperty({ required: false, example: 'payment pending' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  search?: string;
}

export class SupportTicketMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SupportTicketSenderRole })
  senderRole: SupportTicketSenderRole;

  @ApiProperty({ required: false })
  senderId?: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ isArray: true, required: false })
  attachments?: string[];

  @ApiProperty({ default: false })
  isInternalNote: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class SupportTicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ticketNumber: string;

  @ApiProperty({ enum: SupportTicketCategory })
  category: SupportTicketCategory;

  @ApiProperty({ required: false })
  targetId?: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: SupportTicketPriority })
  priority: SupportTicketPriority;

  @ApiProperty({ enum: SupportTicketStatus })
  status: SupportTicketStatus;

  @ApiProperty()
  creatorId: string;

  @ApiProperty({ required: false })
  lastReplyAt?: Date;

  @ApiProperty({ required: false })
  closedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SupportTicketDetailResponseDto {
  @ApiProperty({ type: SupportTicketResponseDto })
  ticket: SupportTicketResponseDto;

  @ApiProperty({ isArray: true, type: SupportTicketMessageResponseDto })
  messages: SupportTicketMessageResponseDto[];
}

export class SupportTicketListResponseDto {
  @ApiProperty({ isArray: true, type: SupportTicketResponseDto })
  tickets: SupportTicketResponseDto[];

  @ApiProperty()
  total: number;
}
