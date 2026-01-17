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
} from '../application/dto/booking.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
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
  async getMyBookings(@CurrentUser() user: User): Promise<BookingResponseDto[]> {
    return this.bookingService.getCustomerBookings(user.id);
  }

  @Get('provider-bookings')
  @ApiOperation({ summary: 'Get bookings received by current provider' })
  @ApiResponse({ status: 200, type: [BookingResponseDto] })
  async getProviderBookings(@CurrentUser() user: User): Promise<BookingResponseDto[]> {
    return this.bookingService.getProviderBookings(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async getBooking(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async createBooking(
    @CurrentUser() user: User,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update booking details' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async updateBooking(
    @CurrentUser() user: User,
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
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.confirm(id, user.id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark booking as started' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async startBooking(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.start(id, user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark booking as completed' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async completeBooking(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.complete(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async cancelBooking(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.cancel(id, user.id, dto);
  }
}
