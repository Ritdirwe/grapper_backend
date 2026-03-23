import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { Permissions } from '@common/decorators/permissions.decorator';
import { BookingFileService } from '../application/services/booking-file.service';
import { BookingFileResponseDto } from '../application/dto/booking-file.dto';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Service Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bookings/:id/files')
@Permissions(PERMISSIONS.MARKETPLACE_BOOKING_FILE_MANAGE_PARTICIPANT)
export class BookingFileController {
  constructor(private readonly bookingFileService: BookingFileService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a workspace file for a booking' })
  @ApiQuery({ name: 'fileType', required: false })
  @ApiResponse({ status: 201, type: BookingFileResponseDto })
  async upload(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
    @Query('fileType') fileType?: string,
  ): Promise<BookingFileResponseDto> {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.bookingFileService.upload(
      bookingId,
      user.id,
      {
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.file?.bytesRead || buffer.length,
        buffer,
      },
      fileType,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all workspace files for a booking' })
  @ApiResponse({ status: 200, type: [BookingFileResponseDto] })
  async list(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingFileResponseDto[]> {
    return this.bookingFileService.list(bookingId, user.id);
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get booking workspace file details' })
  @ApiResponse({ status: 200, type: BookingFileResponseDto })
  async get(
    @Param('id') bookingId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingFileResponseDto> {
    return this.bookingFileService.get(bookingId, fileId, user.id);
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a booking workspace file' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('id') bookingId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.bookingFileService.remove(bookingId, fileId, user.id);
  }
}
