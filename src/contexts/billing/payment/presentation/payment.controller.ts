import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { PaymentService } from '../application/services/payment.service';
import {
  InitializePaymentDto,
  VerifyPaymentDto,
  TransactionResponseDto,
  PaymentInitializationResponseDto,
} from '../application/dto/payment.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PaymentGateway } from '../domain/value-objects/payment-enums.vo';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Payments & Transactions')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('initialize')
  @Permissions(PERMISSIONS.BILLING_PAYMENT_INITIALIZE_SELF)
  @ApiOperation({ summary: 'Initialize a new payment transaction' })
  @ApiResponse({ status: 201, type: PaymentInitializationResponseDto })
  async initializePayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitializePaymentDto,
  ): Promise<PaymentInitializationResponseDto> {
    return this.paymentService.initializePayment(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('verify')
  @Permissions(PERMISSIONS.BILLING_PAYMENT_VERIFY_SELF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a payment transaction reference' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
  ): Promise<TransactionResponseDto> {
    return this.paymentService.verifyPayment(dto);
  }

  @Public()
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook listener' })
  @ApiResponse({ status: 200 })
  async paystackWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ): Promise<{ message: string }> {
    await this.paymentService.handleWebhook(payload, PaymentGateway.PAYSTACK);
    return { message: 'Webhook processed' };
  }

  @Public()
  @Post('webhook/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave webhook listener' })
  @ApiResponse({ status: 200 })
  async flutterwaveWebhook(
    @Body() payload: any,
    @Headers('flutterwave-signature') signature: string,
  ): Promise<{ message: string }> {
    await this.paymentService.handleWebhook(
      payload,
      PaymentGateway.FLUTTERWAVE,
      signature,
    );
    return { message: 'Webhook processed' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('transactions')
  @Permissions(PERMISSIONS.BILLING_PAYMENT_READ_HISTORY_SELF)
  @ApiOperation({ summary: 'Get current user transaction history' })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async getMyTransactions(@CurrentUser() user: AuthUser): Promise<TransactionResponseDto[]> {
    return this.paymentService.getUserTransactions(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('transactions/:reference')
  @Permissions(PERMISSIONS.BILLING_PAYMENT_READ_DETAIL_SELF)
  @ApiOperation({ summary: 'Get transaction details by reference' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async getTransaction(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<TransactionResponseDto> {
    return this.paymentService.getTransaction(reference, user.id);
  }
}
