import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { BookingService } from '../application/services/booking.service';
import { CreateCheckoutDto, CheckoutResponseDto, VerifyPaystackDto } from '../application/dto/checkout.dto';

@ApiTags('Service Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class CheckoutController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Stripe checkout session for a service' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    // This will be implemented in BookingService
    return this.bookingService.createStripeCheckout(user.id, dto);
  }

  @Post('checkout-paystack')
  @ApiOperation({ summary: 'Create a Paystack checkout for a service' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createPaystackCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    return this.bookingService.createPaystackCheckout(user.id, dto);
  }

  @Post(':id/final-payment')
  @ApiOperation({ summary: 'Initiate Stripe completion payment (remaining 80%) for a booking' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createFinalPayment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckoutResponseDto> {
    return this.bookingService.createFinalPaymentSession(user.id, id);
  }

  @Post(':id/completion-payment-paystack')
  @ApiOperation({ summary: 'Initiate Paystack completion payment (remaining 80%) for a booking' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createCompletionPaymentPaystack(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckoutResponseDto> {
    return this.bookingService.createPaystackCompletionPayment(user.id, id);
  }

  @Post(':id/pay-correction')
  @ApiOperation({ summary: 'Pay for a paid correction request' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async payCorrection(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckoutResponseDto> {
    return this.bookingService.createPaystackCorrectionPayment(user.id, id);
  }

  @Post(':id/pay-commission')
  @ApiOperation({ summary: 'Pay platform commission for a booking (Provider)' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async payCommission(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckoutResponseDto> {
    return this.bookingService.createCommissionPaymentSession(user.id, id);
  }

  @Post('verify-paystack')
  @ApiOperation({ summary: 'Verify a Paystack payment reference' })
  async verifyPaystack(@Body() dto: VerifyPaystackDto) {
    return this.bookingService.verifyPaystackPayment(dto.reference);
  }
}
