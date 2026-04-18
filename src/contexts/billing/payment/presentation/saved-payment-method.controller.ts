import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import { SavedPaymentMethodService } from '../application/services/saved-payment-method.service';
import { SavedPaymentMethodResponseDto } from '../application/dto/saved-payment-method.dto';

@ApiTags('Saved Payment Methods')
@ApiBearerAuth()
@Controller('payments/methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SavedPaymentMethodController {
  constructor(private readonly savedPaymentMethodService: SavedPaymentMethodService) {}

  @Get()
  @Permissions(PERMISSIONS.BILLING_PAYMENT_INITIALIZE_SELF)
  @ApiOperation({ summary: 'List saved payment methods for the current user' })
  @ApiResponse({ status: 200, type: [SavedPaymentMethodResponseDto] })
  async getSavedPaymentMethods(@CurrentUser() user: AuthUser): Promise<SavedPaymentMethodResponseDto[]> {
    return this.savedPaymentMethodService.findByUser(user.id);
  }

  @Post(':id/preferred')
  @Permissions(PERMISSIONS.BILLING_PAYMENT_INITIALIZE_SELF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a saved payment method as preferred' })
  @ApiResponse({ status: 200, type: SavedPaymentMethodResponseDto })
  async setPreferredPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<SavedPaymentMethodResponseDto> {
    return this.savedPaymentMethodService.setPreferred(user.id, id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.BILLING_PAYMENT_INITIALIZE_SELF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a saved payment method' })
  @ApiResponse({ status: 200 })
  async deleteSavedPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.savedPaymentMethodService.delete(user.id, id);
  }
}
