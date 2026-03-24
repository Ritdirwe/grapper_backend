import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Query,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PayoutService } from '../application/services/payout.service';
import {
  CreatePayoutDto,
  CreatePayoutReleaseDto,
  PayoutResponseDto,
  PayoutReleaseResponseDto,
  ProviderBalanceDto,
  VerifyPayoutAccountDto,
} from '../application/dto/payout.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PaystackService } from '../infrastructure/gateways/paystack.service';
import { FlutterwaveService } from '../infrastructure/gateways/flutterwave.service';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import { PaymentGateway } from '../domain/value-objects/payment-enums.vo';
import { PayoutReleaseService } from '../application/services/payout-release.service';
import { PayoutReleaseSourceType } from '../domain/entities/payout-release.entity';

@ApiTags('Provider Payouts')
@ApiBearerAuth()
@Controller('payouts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly paystackService: PaystackService,
    private readonly flutterwaveService: FlutterwaveService,
    private readonly payoutReleaseService: PayoutReleaseService,
  ) {}

  @Public()
  @Get('banks')
  @ApiOperation({ summary: 'List available banks for payouts by gateway' })
  @ApiQuery({ name: 'country', required: false, example: 'nigeria' })
  @ApiQuery({ name: 'gateway', required: false, enum: PaymentGateway })
  async listBanks(
    @Query('country') country?: string,
    @Query('gateway') gateway: PaymentGateway = PaymentGateway.PAYSTACK,
  ) {
    if (gateway === PaymentGateway.FLUTTERWAVE) {
      return this.flutterwaveService.listBanks(country || 'NG');
    }
    return this.paystackService.listBanks(country || 'nigeria');
  }

  @Post('verify-account')
  @ApiOperation({ summary: 'Verify a bank account by gateway' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_BANK_VERIFY_SELF)
  async verifyAccount(@Body() dto: VerifyPayoutAccountDto) {
    if (dto.gateway === PaymentGateway.FLUTTERWAVE) {
      return this.flutterwaveService.verifyBankAccount(dto.accountNumber, dto.bankCode);
    }
    return this.paystackService.verifyBankAccount(dto.accountNumber, dto.bankCode);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current provider balance and earnings' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_BALANCE_READ_SELF)
  @ApiResponse({ status: 200, type: ProviderBalanceDto })
  async getBalance(@CurrentUser() user: AuthUser): Promise<ProviderBalanceDto> {
    return this.payoutService.getProviderBalance(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get payout history for current provider' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_HISTORY_READ_SELF)
  @ApiResponse({ status: 200, type: [PayoutResponseDto] })
  async getMyPayouts(@CurrentUser() user: AuthUser): Promise<PayoutResponseDto[]> {
    return this.payoutService.getProviderPayouts(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details by ID' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_DETAIL_READ_SELF)
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async getPayout(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.getPayout(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Request a new payout' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_CREATE_SELF)
  @ApiResponse({ status: 201, type: PayoutResponseDto })
  async createPayout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePayoutDto,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.createPayout(user.id, dto);
  }

  @Get('releases')
  @ApiOperation({ summary: 'Get payout release history for current provider' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_RELEASE_READ_SELF)
  @ApiResponse({ status: 200, type: [PayoutReleaseResponseDto] })
  async getMyReleases(@CurrentUser() user: AuthUser): Promise<PayoutReleaseResponseDto[]> {
    return this.payoutReleaseService.listReleasesForProvider(user.id);
  }

  @Get('releases/admin')
  @ApiOperation({ summary: 'List payout releases (Admin)' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_RELEASE_READ_ADMIN)
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'sourceType', required: false, enum: PayoutReleaseSourceType })
  @ApiQuery({ name: 'sourceId', required: false })
  @ApiResponse({ status: 200, type: [PayoutReleaseResponseDto] })
  async listReleasesAdmin(
    @Query('providerId') providerId?: string,
    @Query('sourceType') sourceType?: PayoutReleaseSourceType,
    @Query('sourceId') sourceId?: string,
  ): Promise<PayoutReleaseResponseDto[]> {
    return this.payoutReleaseService.listReleasesAdmin({
      providerId,
      sourceType,
      sourceId,
    });
  }

  @Post('releases/admin')
  @ApiOperation({ summary: 'Create payout release (Admin)' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_RELEASE_CREATE_ADMIN)
  @ApiResponse({ status: 201, type: PayoutReleaseResponseDto })
  async createRelease(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePayoutReleaseDto,
  ): Promise<PayoutReleaseResponseDto> {
    return this.payoutReleaseService.createRelease(dto, user.id);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a payout (Admin only/Internal)' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_PROCESS_ADMIN)
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async processPayout(@Param('id', new ParseUUIDPipe()) id: string): Promise<PayoutResponseDto> {
    return this.payoutService.processPayout(id);
  }

  @Public()
  @Post('webhook/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave payout webhook listener' })
  @ApiResponse({ status: 200 })
  async flutterwavePayoutWebhook(
    @Body() payload: any,
    @Headers('flutterwave-signature') signature?: string,
  ): Promise<{ message: string }> {
    await this.payoutService.handleFlutterwavePayoutWebhook(payload, signature);
    return { message: 'Webhook processed' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending payout' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_CANCEL_SELF)
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async cancelPayout(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.cancelPayout(id, user.id);
  }
}
