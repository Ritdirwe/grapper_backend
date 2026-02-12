import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDate,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../domain/value-objects/booking-enums.vo';

export class CreateMilestoneDto {
  @ApiProperty({ example: 'Initial Draft' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Provide the first draft of the logo.' })
  @IsString()
  description: string;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2023-12-30T10:00:00Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @ApiProperty({ example: ['Logo Source Files'], isArray: true, required: false })
  @IsArray()
  @IsOptional()
  deliverables?: string[];
}

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsString()
  serviceId: string;

  @ApiProperty({ example: 'Order for a custom logo design.' })
  @IsString()
  description: string;

  @ApiProperty({ example: { color: 'blue' }, required: false })
  @IsObject()
  @IsOptional()
  requirements?: Record<string, any>;

  @ApiProperty({ example: '2024-01-15T10:00:00Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  deliveryDate?: Date;

  @ApiProperty({ type: [CreateMilestoneDto], isArray: true, required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  @IsOptional()
  milestones?: CreateMilestoneDto[];
}

export class UpdateOrderDto {
  @ApiProperty({ example: 'Updated order description.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2024-01-20T10:00:00Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  deliveryDate?: Date;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'Unable to fulfill requirements.' })
  @IsString()
  reason: string;
}

export class OrderMilestoneDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  title: string;
  @ApiProperty()
  amount: number;
  @ApiProperty()
  status: string;
  @ApiProperty({ required: false })
  dueDate?: Date;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  requirements?: Record<string, any>;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  platformFee: number;

  @ApiProperty()
  providerEarnings: number;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty({ required: false })
  paymentReference?: string;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty({ required: false })
  deliveryDate?: Date;

  @ApiProperty({ required: false })
  deliveredAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  cancelledAt?: Date;

  @ApiProperty({ required: false })
  cancellationReason?: string;

  @ApiProperty({ required: false })
  refundAmount?: number;

  @ApiProperty({ required: false })
  refundedAt?: Date;

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

  @ApiProperty({ type: [OrderMilestoneDto], isArray: true, required: false })
  milestones?: OrderMilestoneDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
