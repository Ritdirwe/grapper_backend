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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PaymentGateway } from '../domain/value-objects/payment-enums.vo';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments & Transactions')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  @ApiOperation({ summary: 'Initialize a new payment transaction' })
  @ApiResponse({ status: 201, type: PaymentInitializationResponseDto })
  async initializePayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitializePaymentDto,
  ): Promise<PaymentInitializationResponseDto> {
    return this.paymentService.initializePayment(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify')
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiOperation({ summary: 'Get current user transaction history' })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async getMyTransactions(@CurrentUser() user: AuthUser): Promise<TransactionResponseDto[]> {
    return this.paymentService.getUserTransactions(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:reference')
  @ApiOperation({ summary: 'Get transaction details by reference' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async getTransaction(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<TransactionResponseDto> {
    return this.paymentService.getTransaction(reference, user.id);
  }
}
