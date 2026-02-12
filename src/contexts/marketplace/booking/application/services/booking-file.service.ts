import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingFile } from '../../domain/entities/booking-file.entity';
import { StorageService } from '@infrastructure/storage/application/services/storage.service';
import { BookingFileResponseDto } from '../dto/booking-file.dto';

@Injectable()
export class BookingFileService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingFile)
    private bookingFileRepository: Repository<BookingFile>,
    private storageService: StorageService,
  ) {}

  async upload(
    bookingId: string,
    userId: string,
    file: {
      filename: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    fileType = 'attachment',
  ): Promise<BookingFileResponseDto> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    const path = `bookings/${booking.id}/${Date.now()}-${file.filename}`;
    const url = await this.storageService.uploadFile(file.buffer, path, file.mimetype);

    const bookingFile = this.bookingFileRepository.create({
      bookingId,
      uploadedBy: userId,
      filename: path,
      originalName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url,
      fileType,
    });

    await this.bookingFileRepository.save(bookingFile);
    return this.mapToResponseDto(bookingFile);
  }

  async list(bookingId: string, userId: string): Promise<BookingFileResponseDto[]> {
    await this.getAuthorizedBooking(bookingId, userId);
    const files = await this.bookingFileRepository.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });

    return files.map((file) => this.mapToResponseDto(file));
  }

  async get(bookingId: string, fileId: string, userId: string): Promise<BookingFileResponseDto> {
    await this.getAuthorizedBooking(bookingId, userId);
    const file = await this.bookingFileRepository.findOne({
      where: { id: fileId, bookingId },
    });

    if (!file) {
      throw new NotFoundException('Booking file not found');
    }

    return this.mapToResponseDto(file);
  }

  async remove(bookingId: string, fileId: string, userId: string): Promise<void> {
    await this.getAuthorizedBooking(bookingId, userId);

    const file = await this.bookingFileRepository.findOne({
      where: { id: fileId, bookingId },
    });

    if (!file) {
      throw new NotFoundException('Booking file not found');
    }

    await this.storageService.deleteFile(file.filename);
    await this.bookingFileRepository.remove(file);
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

  private mapToResponseDto(file: BookingFile): BookingFileResponseDto {
    return {
      id: file.id,
      bookingId: file.bookingId,
      uploadedBy: file.uploadedBy,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      fileType: file.fileType,
      createdAt: file.createdAt,
    };
  }
}
