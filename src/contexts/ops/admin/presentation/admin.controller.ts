import {
  Body,
  Controller,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../application/services/admin.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@shared/types/role.type';
import {
  AdminBookingListDto,
  AdminBookingsQueryDto,
  AdminDisputeListDto,
  AdminPaymentListDto,
  AdminUpdateBookingStatusDto,
  ResolveDisputeAdminDto,
  SystemStatsDto,
} from '../application/dto/admin.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get global system statistics for admin dashboard' })
  @ApiResponse({ status: 200, type: SystemStatsDto })
  async getStats(): Promise<SystemStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings for admin monitoring' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, type: AdminBookingListDto })
  async getBookings(
    @Query() query?: AdminBookingsQueryDto,
  ): Promise<AdminBookingListDto> {
    return this.adminService.getBookings(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking detail with related transactions' })
  @ApiResponse({ status: 200 })
  async getBookingDetail(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.adminService.getBookingDetail(id);
  }

  @Put('bookings/:id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update booking status (moderation-safe actions only)' })
  @ApiResponse({ status: 204 })
  async updateBookingStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminUpdateBookingStatusDto,
  ): Promise<void> {
    return this.adminService.updateBookingStatus(user.id, id, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get all transactions for admin monitoring' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: AdminPaymentListDto })
  async getPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<AdminPaymentListDto> {
    return this.adminService.getPayments(page, limit);
  }

  @Get('payments/summary')
  @ApiOperation({ summary: 'Get payment summary for selected period' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200 })
  async getPaymentSummary(
    @Query('period') period?: 'day' | 'week' | 'month',
  ): Promise<Record<string, unknown>> {
    return this.adminService.getPaymentSummary(period);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Get all booking disputes for admin management' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, type: AdminDisputeListDto })
  async getDisputes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ): Promise<AdminDisputeListDto> {
    return this.adminService.getDisputes(page, limit, status);
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute detail with booking context' })
  @ApiResponse({ status: 200 })
  async getDisputeDetail(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.adminService.getDisputeDetail(id);
  }

  @Put('disputes/:id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resolve a dispute as admin' })
  @ApiResponse({ status: 204 })
  async resolveDispute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeAdminDto,
  ): Promise<void> {
    return this.adminService.resolveDispute(user.id, id, dto);
  }

  @Put('bookings/:id/force-refund')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Force refund a booking and cancel it' })
  @ApiResponse({ status: 204 })
  async forceRefundBooking(@Param('id') id: string): Promise<void> {
    return this.adminService.forceRefundBooking(id);
  }

  @Put('services/:id/:action')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Manage service status (activate, deactivate, delete)' })
  @ApiResponse({ status: 204 })
  async manageService(
    @Param('id') id: string,
    @Param('action') action: 'activate' | 'deactivate' | 'delete',
  ) {
    return this.adminService.manageService(id, action);
  }

  @Delete('content/:type/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete global content by type and ID' })
  @ApiResponse({ status: 204 })
  async deleteContent(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteContent(user.id, type, id);
  }
}
