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
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { User } from '../../domain/entities/user.entity';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@Controller('payout-methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayoutMethodController {
  constructor(private readonly payoutMethodService: PayoutMethodService) {}

  @Get()
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_READ_SELF)
  async getPayoutMethods(@CurrentUser() user: User): Promise<PayoutMethodResponseDto[]> {
    return this.payoutMethodService.getPayoutMethods(user.id);
  }

  @Get('default')
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_READ_SELF)
  async getDefaultPayoutMethod(
    @CurrentUser() user: User,
  ): Promise<PayoutMethodResponseDto | null> {
    return this.payoutMethodService.getDefaultPayoutMethod(user.id);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_READ_SELF)
  async getPayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.getPayoutMethod(user.id, id);
  }

  @Post()
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_CREATE_SELF)
  async createPayoutMethod(
    @CurrentUser() user: User,
    @Body() dto: CreatePayoutMethodDto,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.createPayoutMethod(user.id, dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_UPDATE_SELF)
  async updatePayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePayoutMethodDto>,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.updatePayoutMethod(user.id, id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_DELETE_SELF)
  async deletePayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.payoutMethodService.deletePayoutMethod(user.id, id);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.IDENTITY_PAYOUT_METHOD_SET_DEFAULT_SELF)
  async setDefaultPayoutMethod(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PayoutMethodResponseDto> {
    return this.payoutMethodService.setDefaultPayoutMethod(user.id, id);
  }
}
