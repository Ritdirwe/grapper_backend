import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadBookingFileDto {
  @ApiProperty({ required: false, example: 'deliverable' })
  @IsString()
  @IsOptional()
  fileType?: string;
}

export class BookingFileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  uploadedBy: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  url: string;

  @ApiProperty()
  fileType: string;

  @ApiProperty()
  createdAt: Date;
}
