import { ApiProperty } from '@nestjs/swagger';
import { PaymentGateway } from '../../domain/value-objects/payment-enums.vo';

export class SavedPaymentMethodResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: PaymentGateway })
  gateway: PaymentGateway;

  @ApiProperty({ required: false })
  cardBrand?: string;

  @ApiProperty({ required: false })
  last4?: string;

  @ApiProperty({ required: false })
  expiryMonth?: string;

  @ApiProperty({ required: false })
  expiryYear?: string;

  @ApiProperty()
  isReusable: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ required: false })
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
