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
} from '@nestjs/common';
import { PayoutService } from '../application/services/payout.service';
import {
  CreatePayoutDto,
  PayoutResponseDto,
  ProviderBalanceDto,
} from '../application/dto/payout.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PaystackService } from '../infrastructure/gateways/paystack.service';
import { IsString } from 'class-validator';

class VerifyAccountDto {
  @IsString()
  accountNumber: string;
  @IsString()
  bankCode: string;
}

@ApiTags('Provider Payouts')
@ApiBearerAuth()
@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly paystackService: PaystackService,
  ) {}

  @Public()
  @Get('banks')
  @ApiOperation({ summary: 'List available banks for Payouts (Paystack)' })
  @ApiQuery({ name: 'country', required: false, example: 'nigeria' })
  async listBanks(@Param('country') country?: string) {
    return this.paystackService.listBanks(country || 'nigeria');
  }

  @Post('verify-account')
  @ApiOperation({ summary: 'Verify a bank account (Paystack)' })
  async verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.paystackService.verifyBankAccount(dto.accountNumber, dto.bankCode);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current provider balance and earnings' })
  @ApiResponse({ status: 200, type: ProviderBalanceDto })
  async getBalance(@CurrentUser() user: User): Promise<ProviderBalanceDto> {
    return this.payoutService.getProviderBalance(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get payout history for current provider' })
  @ApiResponse({ status: 200, type: [PayoutResponseDto] })
  async getMyPayouts(@CurrentUser() user: User): Promise<PayoutResponseDto[]> {
    return this.payoutService.getProviderPayouts(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details by ID' })
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async getPayout(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.getPayout(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Request a new payout' })
  @ApiResponse({ status: 201, type: PayoutResponseDto })
  async createPayout(
    @CurrentUser() user: User,
    @Body() dto: CreatePayoutDto,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.createPayout(user.id, dto);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a payout (Admin only/Internal)' })
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async processPayout(@Param('id') id: string): Promise<PayoutResponseDto> {
    // This would typically be admin-only or automated
    return this.payoutService.processPayout(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending payout' })
  @ApiResponse({ status: 200, type: PayoutResponseDto })
  async cancelPayout(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutService.cancelPayout(id, user.id);
  }
}
