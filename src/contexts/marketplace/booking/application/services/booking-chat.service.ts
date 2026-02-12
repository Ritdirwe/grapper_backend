import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingMessage } from '../../domain/entities/booking-message.entity';
import {
  BookingMessageResponseDto,
  SendBookingMessageDto,
} from '../dto/booking-message.dto';

@Injectable()
export class BookingChatService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingMessage)
    private bookingMessageRepository: Repository<BookingMessage>,
  ) {}

  async send(
    bookingId: string,
    userId: string,
    dto: SendBookingMessageDto,
  ): Promise<BookingMessageResponseDto> {
    await this.getAuthorizedBooking(bookingId, userId);

    const message = this.bookingMessageRepository.create({
      bookingId,
      senderId: userId,
      content: dto.content,
      messageType: dto.messageType || 'text',
      attachments: dto.attachments,
    });

    await this.bookingMessageRepository.save(message);
    return this.mapToResponseDto(message);
  }

  async list(
    bookingId: string,
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<BookingMessageResponseDto[]> {
    await this.getAuthorizedBooking(bookingId, userId);

    const messages = await this.bookingMessageRepository.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages.map((message) => this.mapToResponseDto(message));
  }

  async markAsRead(bookingId: string, messageId: string, userId: string): Promise<void> {
    await this.getAuthorizedBooking(bookingId, userId);

    const message = await this.bookingMessageRepository.findOne({
      where: { id: messageId, bookingId },
    });

    if (!message) {
      throw new NotFoundException('Booking message not found');
    }

    message.readAt = new Date();
    await this.bookingMessageRepository.save(message);
  }

  private async getAuthorizedBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  private mapToResponseDto(message: BookingMessage): BookingMessageResponseDto {
    return {
      id: message.id,
      bookingId: message.bookingId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      attachments: message.attachments,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
