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
} from '@nestjs/common';
import { PayoutService } from '../application/services/payout.service';
import {
  CreatePayoutDto,
  PayoutResponseDto,
  ProviderBalanceDto,
} from '../application/dto/payout.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PaystackService } from '../infrastructure/gateways/paystack.service';
import { IsString } from 'class-validator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';

class VerifyAccountDto {
  @IsString()
  accountNumber: string;
  @IsString()
  bankCode: string;
}

@ApiTags('Provider Payouts')
@ApiBearerAuth()
@Controller('payouts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly paystackService: PaystackService,
  ) {}

  @Public()
  @Get('banks')
  @ApiOperation({ summary: 'List available banks for Payouts (Paystack)' })
  @ApiQuery({ name: 'country', required: false, example: 'nigeria' })
  async listBanks(@Query('country') country?: string) {
    return this.paystackService.listBanks(country || 'nigeria');
  }

  @Post('verify-account')
  @ApiOperation({ summary: 'Verify a bank account (Paystack)' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_BANK_VERIFY_SELF)
  async verifyAccount(@Body() dto: VerifyAccountDto) {
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
    @Param('id') id: string,
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

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a payout (Admin only/Internal)' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_PROCESS_ADMIN)
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async processPayout(@Param('id') id: string): Promise<PayoutResponseDto> {
    return this.payoutService.processPayout(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending payout' })
  @Permissions(PERMISSIONS.BILLING_PAYOUT_CANCEL_SELF)
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async cancelPayout(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.cancelPayout(id, user.id);
  }
}
