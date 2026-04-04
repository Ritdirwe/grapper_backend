import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingPaymentMetaDto } from './booking.dto';

export class CreateCheckoutDto {
  @ApiProperty({ type: BookingPaymentMetaDto })
  @IsObject()
  paymentMeta: BookingPaymentMetaDto;

  @ApiProperty({ example: 'https://grapper.com/bookings' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}

export class CheckoutResponseDto {
  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  authorizationUrl?: string;

  @ApiProperty({ required: false })
  clientSecret?: string;

  @ApiProperty({ required: false })
  accessCode?: string;

  @ApiProperty({ required: false, enum: ['redirect', 'sdk', 'embedded'] })
  mode?: 'redirect' | 'sdk' | 'embedded';

  @ApiProperty({ required: false, description: 'Public/publishable key for active gateway SDK' })
  publicKey?: string;

  @ApiProperty()
  processor: string;

  @ApiProperty()
  reference: string;
}

export class VerifyPaystackDto {
  @ApiProperty()
  @IsString()
  reference: string;
}
