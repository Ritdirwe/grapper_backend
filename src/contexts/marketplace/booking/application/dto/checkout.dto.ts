import { IsUUID, IsUrl, IsEmail, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 'https://gripper.com/bookings' })
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
}

export class CheckoutResponseDto {
  @ApiProperty()
  url: string;

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
