import { IsUUID, IsUrl, IsEmail, IsOptional, IsEnum, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FlutterwaveCheckoutDto {
  @ApiProperty({
    description: 'Flutterwave orchestrator customer payload',
    required: false,
    example: {
      email: 'user@example.com',
      name: { first: 'Jane', last: 'Doe' },
    },
  })
  @IsObject()
  @IsOptional()
  customer?: Record<string, any>;

  @ApiProperty({
    description: 'Flutterwave orchestrator payment_method payload',
    example: {
      type: 'card',
      card: {
        nonce: 'w2zQDGCf1QXA',
        encrypted_card_number: '...',
        encrypted_expiry_month: '...',
        encrypted_expiry_year: '...',
        encrypted_cvv: '...',
      },
    },
  })
  @IsObject()
  paymentMethod: Record<string, any>;
}

export class CreateCheckoutDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 'https://grapper.com/bookings' })
  @IsUrl()
  redirectURL: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'card', required: false, enum: ['card', 'bank_transfer'] })
  @IsOptional()
  @IsEnum(['card', 'bank_transfer'])
  paymentMethod?: string;

  @ApiProperty({ required: false, type: FlutterwaveCheckoutDto })
  @IsOptional()
  @IsObject()
  flutterwave?: FlutterwaveCheckoutDto;
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
