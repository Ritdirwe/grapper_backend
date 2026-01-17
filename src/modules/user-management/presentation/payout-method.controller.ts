import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PayoutMethodService } from '../application/services/payout-method.service';
import {
  CreatePayoutMethodDto,
  PayoutMethodResponseDto,
} from '../application/dto/payout-method.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';

@Controller('payout-methods')
@UseGuards(JwtAuthGuard)
export class PayoutMethodController {
  constructor(private readonly payoutMethodService: PayoutMethodService) {}

  @Get()
  async getPayoutMethods(@CurrentUser() user: User): Promise<PayoutMethodResponseDto[]> {
    return this.payoutMethodService.getPayoutMethods(user.id);
  }

  @Get('default')
  async getDefaultPayoutMethod(
    @CurrentUser() user: User,
  ): Promise<PayoutMethodResponseDto | null> {
    return this.payoutMethodService.getDefaultPayoutMethod(user.id);
  }

  @Get(':id')
  async getPayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.getPayoutMethod(user.id, id);
  }

  @Post()
  async createPayoutMethod(
    @CurrentUser() user: User,
    @Body() dto: CreatePayoutMethodDto,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.createPayoutMethod(user.id, dto);
  }

  @Put(':id')
  async updatePayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePayoutMethodDto>,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.updatePayoutMethod(user.id, id, dto);
  }

  @Delete(':id')
  async deletePayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.payoutMethodService.deletePayoutMethod(user.id, id);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefaultPayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.setDefaultPayoutMethod(user.id, id);
  }
}
