import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from '../application/services/booking.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  BookingResponseDto,
  DeliverBookingDto,
  RequestCorrectionDto,
} from '../application/dto/booking.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Service Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('my-bookings')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_READ_OWN)
  @ApiOperation({ summary: 'Get bookings made by current customer' })
  @ApiResponse({ status: 200, type: [BookingResponseDto] })
  async getMyBookings(@CurrentUser() user: AuthUser): Promise<BookingResponseDto[]> {
    return this.bookingService.getCustomerBookings(user.id);
  }

  @Get('provider-bookings')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_READ_OWN)
  @ApiOperation({ summary: 'Get bookings received by current provider' })
  @ApiResponse({ status: 200, type: [BookingResponseDto] })
  async getProviderBookings(@CurrentUser() user: AuthUser): Promise<BookingResponseDto[]> {
    return this.bookingService.getProviderBookings(user.id);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_READ)
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async getBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.findById(id, user.id);
  }

  @Post()
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_CREATE)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async createBooking(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.create(user.id, dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_UPDATE)
  @ApiOperation({ summary: 'Update booking details' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async updateBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.update(id, user.id, dto);
  }

  @Post(':id/confirm')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_CONFIRM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a booking request' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async confirmBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.confirm(id, user.id);
  }

  @Post(':id/start')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_START)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark booking as started' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async startBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.start(id, user.id);
  }

  @Post(':id/complete')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_COMPLETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark booking as completed' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async completeBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.complete(id, user.id);
  }

  @Post(':id/deliver')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_DELIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deliver booking work for customer review' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async deliverBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeliverBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.deliver(id, user.id, dto);
  }

  @Post(':id/approve')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve delivered work and unlock completion payment' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async approveDelivery(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.approveDelivery(id, user.id);
  }

  @Post(':id/correction')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_REQUEST_CORRECTION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a correction for delivered booking work' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async requestCorrection(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RequestCorrectionDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.requestCorrection(id, user.id, dto);
  }

  @Post(':id/cancel')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_CANCEL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async cancelBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.cancel(id, user.id, dto);
  }
}
