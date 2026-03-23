import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { Permissions } from '@common/decorators/permissions.decorator';
import { BookingChatService } from '../application/services/booking-chat.service';
import {
  BookingMessageResponseDto,
  SendBookingMessageDto,
} from '../application/dto/booking-message.dto';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Service Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bookings/:id/messages')
@Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CHAT_MANAGE_PARTICIPANT)
export class BookingChatController {
  constructor(private readonly bookingChatService: BookingChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a booking workspace message' })
  @ApiResponse({ status: 201, type: BookingMessageResponseDto })
  async send(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendBookingMessageDto,
  ): Promise<BookingMessageResponseDto> {
    return this.bookingChatService.send(bookingId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List booking workspace messages' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [BookingMessageResponseDto] })
  async list(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<BookingMessageResponseDto[]> {
    return this.bookingChatService.list(bookingId, user.id, page, limit);
  }

  @Put(':msgId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a booking workspace message as read' })
  @ApiResponse({ status: 204 })
  async markAsRead(
    @Param('id') bookingId: string,
    @Param('msgId') messageId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.bookingChatService.markAsRead(bookingId, messageId, user.id);
  }
}
