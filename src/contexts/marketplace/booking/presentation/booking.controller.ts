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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Service Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get bookings made by current customer' })
  @ApiResponse({ status: 200, type: [BookingResponseDto] })
  async getMyBookings(@CurrentUser() user: AuthUser): Promise<BookingResponseDto[]> {
    return this.bookingService.getCustomerBookings(user.id);
  }

  @Get('provider-bookings')
  @ApiOperation({ summary: 'Get bookings received by current provider' })
  @ApiResponse({ status: 200, type: [BookingResponseDto] })
  async getProviderBookings(@CurrentUser() user: AuthUser): Promise<BookingResponseDto[]> {
    return this.bookingService.getProviderBookings(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async getBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async createBooking(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.create(user.id, dto);
  }

  @Put(':id')
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
