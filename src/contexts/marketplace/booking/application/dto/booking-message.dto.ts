import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendBookingMessageDto {
  @ApiProperty({ example: 'Please check the latest upload.' })
  @IsString()
  content: string;

  @ApiProperty({ required: false, example: 'text' })
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiProperty({ required: false, isArray: true, example: ['https://cdn.example.com/file.pdf'] })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}

export class BookingMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  messageType: string;

  @ApiProperty({ required: false, isArray: true })
  attachments?: string[];

  @ApiProperty({ required: false })
  readAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
