import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import {
  BookingMilestoneEvidenceResponseDto,
  BookingMilestoneResponseDto,
  ProposeBookingMilestonesDto,
  UploadBookingMilestoneEvidenceDto,
} from '../application/dto/booking-milestone.dto';
import { BookingMilestoneService } from '../application/services/booking-milestone.service';

@ApiTags('Service Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('bookings/:id/milestones')
export class BookingMilestoneController {
  constructor(private readonly bookingMilestoneService: BookingMilestoneService) {}

  @Post('propose')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_DELIVER)
  @ApiOperation({ summary: 'Propose booking milestones' })
  @ApiResponse({ status: 201, type: [BookingMilestoneResponseDto] })
  async propose(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ProposeBookingMilestonesDto,
  ): Promise<BookingMilestoneResponseDto[]> {
    return this.bookingMilestoneService.proposeMilestones(bookingId, user.id, dto);
  }

  @Get()
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_READ)
  @ApiOperation({ summary: 'List booking milestones' })
  @ApiResponse({ status: 200, type: [BookingMilestoneResponseDto] })
  async list(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingMilestoneResponseDto[]> {
    return this.bookingMilestoneService.listMilestones(bookingId, user.id);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_APPROVE)
  @ApiOperation({ summary: 'Confirm proposed milestones' })
  @ApiResponse({ status: 200, type: [BookingMilestoneResponseDto] })
  async confirm(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingMilestoneResponseDto[]> {
    return this.bookingMilestoneService.confirmMilestones(bookingId, user.id);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_APPROVE)
  @ApiOperation({ summary: 'Reject proposed milestones' })
  @ApiResponse({ status: 200, type: [BookingMilestoneResponseDto] })
  async reject(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Query('reason') reason: string,
  ): Promise<BookingMilestoneResponseDto[]> {
    if (!reason) {
      throw new BadRequestException('Reason is required');
    }

    return this.bookingMilestoneService.rejectMilestones(bookingId, user.id, reason);
  }

  @Post(':milestoneId/evidence')
  @ApiConsumes('multipart/form-data')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PROVIDER_DELIVER)
  @ApiOperation({ summary: 'Submit milestone evidence' })
  @ApiResponse({ status: 201, type: BookingMilestoneEvidenceResponseDto })
  async submitEvidence(
    @Param('id') bookingId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
  ): Promise<BookingMilestoneEvidenceResponseDto> {
    const parts = req.parts ? await req.parts() : [];
    let file: any = null;
    const dto: UploadBookingMilestoneEvidenceDto = { ...(req.body || {}) };

    for await (const part of parts) {
      if (part.type === 'file') {
        file = part;
      } else if (part.fieldname === 'note') {
        dto.note = String(await part.value);
      } else if (part.fieldname === 'externalUrl') {
        dto.externalUrl = String(await part.value);
      }
    }

    if (file) {
      const buffer = await file.toBuffer();
      return this.bookingMilestoneService.submitEvidence(
        bookingId,
        milestoneId,
        user.id,
        dto,
        {
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.file?.bytesRead || buffer.length,
          buffer,
        },
      );
    }

    return this.bookingMilestoneService.submitEvidence(bookingId, milestoneId, user.id, dto);
  }

  @Get(':milestoneId/evidence')
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_PARTICIPANT_READ)
  @ApiOperation({ summary: 'List milestone evidence' })
  @ApiResponse({ status: 200, type: [BookingMilestoneEvidenceResponseDto] })
  async listEvidence(
    @Param('id') bookingId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingMilestoneEvidenceResponseDto[]> {
    return this.bookingMilestoneService.listEvidence(bookingId, milestoneId, user.id);
  }

  @Post(':milestoneId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_APPROVE)
  @ApiOperation({ summary: 'Approve milestone and release funds' })
  @ApiResponse({ status: 200, type: [BookingMilestoneResponseDto] })
  async approve(
    @Param('id') bookingId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingMilestoneResponseDto[]> {
    return this.bookingMilestoneService.approveMilestone(bookingId, milestoneId, user.id);
  }

  @Post(':milestoneId/reject')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSIONS.MARKETPLACE_BOOKING_CUSTOMER_APPROVE)
  @ApiOperation({ summary: 'Reject milestone evidence' })
  @ApiResponse({ status: 200, type: [BookingMilestoneResponseDto] })
  async rejectMilestone(
    @Param('id') bookingId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: AuthUser,
    @Query('reason') reason: string,
  ): Promise<BookingMilestoneResponseDto[]> {
    if (!reason) {
      throw new BadRequestException('Reason is required');
    }

    return this.bookingMilestoneService.rejectMilestone(bookingId, milestoneId, user.id, reason);
  }
}
