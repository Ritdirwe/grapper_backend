import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingMilestone } from '../../domain/entities/booking-milestone.entity';
import { BookingMilestoneEvidence } from '../../domain/entities/booking-milestone-evidence.entity';
import { BookingStatus, MilestoneStatus } from '../../domain/value-objects/booking-enums.vo';
import {
  BookingMilestoneEvidenceResponseDto,
  BookingMilestoneResponseDto,
  ProposeBookingMilestonesDto,
  UploadBookingMilestoneEvidenceDto,
} from '../dto/booking-milestone.dto';
import { StorageService } from '@infrastructure/storage/application/services/storage.service';
import { PayoutReleaseService } from '@contexts/billing/payment/application/services/payout-release.service';
import {
  PayoutReleaseMode,
  PayoutReleaseSourceType,
} from '@contexts/billing/payment/domain/entities/payout-release.entity';
import { NotificationOrchestratorService } from '@contexts/community/notification/application/services/notification-orchestrator.service';
import { NotificationCategory } from '@contexts/community/notification/application/dto/notification-event.dto';
import { NotificationType } from '@contexts/community/notification/domain/value-objects/notification-type.vo';
import { AdminPenaltySettingsService } from '@contexts/ops/admin/application/services/admin-penalty-settings.service';

@Injectable()
export class BookingMilestoneService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingMilestone)
    private readonly milestoneRepository: Repository<BookingMilestone>,
    @InjectRepository(BookingMilestoneEvidence)
    private readonly evidenceRepository: Repository<BookingMilestoneEvidence>,
    private readonly storageService: StorageService,
    private readonly payoutReleaseService: PayoutReleaseService,
    private readonly notificationOrchestratorService: NotificationOrchestratorService,
    private readonly adminPenaltySettingsService: AdminPenaltySettingsService,
    private readonly dataSource: DataSource,
  ) {}

  async proposeMilestones(
    bookingId: string,
    userId: string,
    dto: ProposeBookingMilestonesDto,
  ): Promise<BookingMilestoneResponseDto[]> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    if (!booking.depositPaid) {
      throw new BadRequestException('Booking must be paid before milestone setup');
    }

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can propose milestones');
    }

    if (![BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS].includes(booking.status)) {
      throw new BadRequestException('Booking must be confirmed before proposing milestones');
    }

    if (!dto.milestones.length) {
      throw new BadRequestException('At least one milestone is required');
    }

    const totalPercent = dto.milestones.reduce((sum, milestone) => sum + Number(milestone.percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new BadRequestException('Milestone percentages must total 100');
    }

    const existingMilestones = await this.milestoneRepository.find({
      where: { bookingId },
      relations: ['evidences'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    if (existingMilestones.some((milestone) => [
      MilestoneStatus.CONFIRMED,
      MilestoneStatus.IN_PROGRESS,
      MilestoneStatus.SUBMITTED,
      MilestoneStatus.APPROVED,
    ].includes(milestone.status))) {
      throw new BadRequestException('Milestones already active for this booking');
    }

    if (existingMilestones.length > 0) {
      await this.milestoneRepository.remove(existingMilestones);
    }

    const releasableTotal = this.getBookingReleasableTotal(booking);
    const milestones = dto.milestones.map((milestone, index) =>
      this.milestoneRepository.create({
        bookingId,
        createdBy: userId,
        title: milestone.title,
        description: milestone.description,
        percent: Number(milestone.percent),
        estimatedAmount: this.roundMoney((releasableTotal * Number(milestone.percent)) / 100),
        status: MilestoneStatus.PROPOSED,
        sortOrder: milestone.sortOrder ?? index + 1,
      }),
    );

    await this.milestoneRepository.save(milestones);

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_MILESTONE_CREATED,
      title: 'Milestones ready for review',
      body: `${booking.service?.title || 'Your booking'} milestone plan is ready to confirm.`,
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
      },
    });

    return this.listMilestones(bookingId, userId);
  }

  async confirmMilestones(bookingId: string, userId: string): Promise<BookingMilestoneResponseDto[]> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    if (!booking.depositPaid) {
      throw new BadRequestException('Booking must be paid before milestone confirmation');
    }

    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can confirm milestones');
    }

    const milestones = await this.milestoneRepository.find({
      where: { bookingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      relations: ['evidences'],
    });

    if (!milestones.length) {
      throw new BadRequestException('No milestone proposal found');
    }

    if (milestones.some((milestone) => milestone.status !== MilestoneStatus.PROPOSED)) {
      throw new BadRequestException('Only proposed milestones can be confirmed');
    }

    milestones.forEach((milestone) => {
      milestone.status = MilestoneStatus.CONFIRMED;
    });

    await this.milestoneRepository.save(milestones);

    await this.notificationOrchestratorService.notifyUser(booking.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_MILESTONE_CONFIRMED,
      title: 'Milestones confirmed',
      body: `${booking.service?.title || 'Your booking'} milestone plan was confirmed.`,
      data: {
        bookingId: booking.id,
      },
    });

    return this.listMilestones(bookingId, userId);
  }

  async rejectMilestones(bookingId: string, userId: string, reason: string): Promise<BookingMilestoneResponseDto[]> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    if (!booking.depositPaid) {
      throw new BadRequestException('Booking must be paid before milestone review');
    }

    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can reject milestones');
    }

    const milestones = await this.milestoneRepository.find({ where: { bookingId } });
    if (!milestones.length) {
      throw new BadRequestException('No milestone proposal found');
    }

    if (milestones.some((milestone) => milestone.status === MilestoneStatus.APPROVED)) {
      throw new BadRequestException('Approved milestones cannot be rejected');
    }

    milestones.forEach((milestone) => {
      milestone.status = MilestoneStatus.REJECTED;
      milestone.rejectionReason = reason;
      milestone.rejectedAt = new Date();
    });

    await this.milestoneRepository.save(milestones);

    await this.notificationOrchestratorService.notifyUser(booking.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_MILESTONE_REJECTED,
      title: 'Milestones rejected',
      body: `${booking.service?.title || 'Your booking'} milestone plan was rejected.`,
      data: {
        bookingId: booking.id,
      },
    });

    return this.listMilestones(bookingId, userId);
  }

  async listMilestones(bookingId: string, userId: string): Promise<BookingMilestoneResponseDto[]> {
    await this.getAuthorizedBooking(bookingId, userId);
    const milestones = await this.milestoneRepository.find({
      where: { bookingId },
      relations: ['evidences'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return milestones.map((milestone) => this.mapMilestone(milestone));
  }

  async submitEvidence(
    bookingId: string,
    milestoneId: string,
    userId: string,
    dto: UploadBookingMilestoneEvidenceDto,
    file?: {
      filename: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ): Promise<BookingMilestoneEvidenceResponseDto> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    if (!booking.depositPaid) {
      throw new BadRequestException('Booking must be paid before milestone evidence submission');
    }
    const milestone = await this.getMilestone(bookingId, milestoneId);

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can submit milestone evidence');
    }

    if (milestone.status === MilestoneStatus.APPROVED) {
      throw new BadRequestException('Approved milestones cannot accept new evidence');
    }

    if (!file && !dto.note && !dto.externalUrl) {
      throw new BadRequestException('Evidence must include a file, note, or external URL');
    }

    const penaltySettings = await this.adminPenaltySettingsService.getCurrentSettings();
    const evidenceCountBefore = await this.evidenceRepository.count({ where: { bookingId, milestoneId } });
    const evidencePenalty = this.calculateProviderEvidencePenalty(
      booking,
      milestone,
      penaltySettings.providerEvidenceEnabled,
      Number(penaltySettings.providerEvidenceFreeLimit || 0),
      Number(penaltySettings.providerEvidenceFlatPenalty || 0),
      Number(penaltySettings.providerEvidencePercentPenalty || 0),
      evidenceCountBefore,
    );

    let storagePath = '';
    let url = dto.externalUrl || '';
    let originalName = dto.externalUrl ? 'external-evidence' : 'note-only';
    let mimeType = 'text/plain';
    let size = 0;

    if (file) {
      storagePath = `bookings/${bookingId}/milestones/${milestoneId}/${Date.now()}-${file.filename}`;
      url = await this.storageService.uploadFile(file.buffer, storagePath, file.mimetype);
      originalName = file.filename;
      mimeType = file.mimetype;
      size = file.size;
    } else {
      const noteContent = [dto.note?.trim(), dto.externalUrl ? `External URL: ${dto.externalUrl}` : '']
        .filter(Boolean)
        .join('\n');

      const buffer = Buffer.from(noteContent || 'Milestone evidence', 'utf8');
      storagePath = `bookings/${bookingId}/milestones/${milestoneId}/${Date.now()}-evidence.txt`;
      url = await this.storageService.uploadFile(buffer, storagePath, 'text/plain');
      originalName = dto.externalUrl ? 'evidence-link.txt' : 'note.txt';
      mimeType = 'text/plain';
      size = buffer.length;
    }

    const evidence = this.evidenceRepository.create({
      bookingId,
      milestoneId,
      uploadedBy: userId,
      storagePath: storagePath || dto.externalUrl || `bookings/${bookingId}/milestones/${milestoneId}/note-${Date.now()}`,
      url: url || dto.externalUrl || '',
      originalName,
      mimeType,
      size,
      note: dto.note,
      externalUrl: dto.externalUrl,
      metadata: evidencePenalty
        ? {
            penaltyType: 'provider_evidence_over_limit',
            penaltyApplied: true,
            penaltyAmount: evidencePenalty,
            penaltyMode: 'escrow_deduction',
            freeLimit: Number(penaltySettings.providerEvidenceFreeLimit || 0),
            evidenceCount: evidenceCountBefore + 1,
          }
        : {
            penaltyApplied: false,
            evidenceCount: evidenceCountBefore + 1,
          },
    });

    await this.evidenceRepository.save(evidence);

    milestone.status = MilestoneStatus.SUBMITTED;
    milestone.submittedAt = milestone.submittedAt || new Date();
    await this.milestoneRepository.save(milestone);

    if (booking.status === BookingStatus.CONFIRMED) {
      booking.status = BookingStatus.IN_PROGRESS;
      await this.bookingRepository.save(booking);
    }

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_MILESTONE_SUBMITTED,
      title: 'Milestone evidence submitted',
      body: `${booking.service?.title || 'Your booking'} received new evidence for review.`,
      data: {
        bookingId: booking.id,
        milestoneId,
      },
    });

    return this.mapEvidence(evidence);
  }

  async listEvidence(bookingId: string, milestoneId: string, userId: string): Promise<BookingMilestoneEvidenceResponseDto[]> {
    await this.getAuthorizedBooking(bookingId, userId);
    await this.getMilestone(bookingId, milestoneId);

    const evidences = await this.evidenceRepository.find({
      where: { bookingId, milestoneId },
      order: { createdAt: 'DESC' },
    });

    return evidences.map((evidence) => this.mapEvidence(evidence));
  }

  async approveMilestone(bookingId: string, milestoneId: string, userId: string): Promise<BookingMilestoneResponseDto[]> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    if (!booking.depositPaid) {
      throw new BadRequestException('Booking must be paid before milestone approval');
    }
    const milestone = await this.getMilestone(bookingId, milestoneId);

    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can approve milestones');
    }

    const evidenceCount = await this.evidenceRepository.count({ where: { bookingId, milestoneId } });
    if (evidenceCount === 0) {
      throw new BadRequestException('Milestone evidence is required before approval');
    }

    if (milestone.status === MilestoneStatus.APPROVED) {
      throw new BadRequestException('Milestone is already approved');
    }

    const penaltySettings = await this.adminPenaltySettingsService.getCurrentSettings();
    const evidencePenaltyTotal = await this.getEvidencePenaltyTotal(bookingId, milestoneId);
    const rejectionPenaltyTotal = this.getMilestoneRejectionPenaltyTotal(milestone, penaltySettings);
    const totalPenalty = this.roundMoney(evidencePenaltyTotal + rejectionPenaltyTotal);
    const grossAmount = Number(milestone.estimatedAmount);
    const netAmount = this.roundMoney(Math.max(grossAmount - totalPenalty, 0));

    milestone.status = MilestoneStatus.APPROVED;
    milestone.approvedAt = new Date();
    await this.milestoneRepository.save(milestone);

    await this.payoutReleaseService.createRelease(
      {
        providerId: booking.providerId,
        sourceType: PayoutReleaseSourceType.BOOKING,
        sourceId: booking.id,
        releaseMode: PayoutReleaseMode.MILESTONE,
        milestoneId: milestone.id,
        amount: netAmount,
        grossAmount,
        penaltyAmount: totalPenalty,
        penaltyReason: totalPenalty > 0 ? 'Milestone penalties applied' : undefined,
        progressPercent: Number(milestone.percent),
        reason: `Milestone approved: ${milestone.title}`,
      },
      userId,
    );

    const allMilestones = await this.milestoneRepository.find({ where: { bookingId } });
    if (allMilestones.length > 0 && allMilestones.every((item) => item.status === MilestoneStatus.APPROVED)) {
      booking.status = BookingStatus.COMPLETED;
      booking.finalPaymentPaid = true;
      booking.customerApproved = true;
      booking.customerApprovedAt = new Date();
      booking.completedAt = new Date();
      await this.bookingRepository.save(booking);
    }

    await this.notificationOrchestratorService.notifyUser(booking.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_MILESTONE_APPROVED,
      title: 'Milestone approved',
      body: `${booking.service?.title || 'Your booking'} milestone was approved.`,
      data: {
        bookingId: booking.id,
        milestoneId,
      },
    });

    return this.listMilestones(bookingId, userId);
  }

  async rejectMilestone(bookingId: string, milestoneId: string, userId: string, reason: string): Promise<BookingMilestoneResponseDto[]> {
    const booking = await this.getAuthorizedBooking(bookingId, userId);

    if (!booking.depositPaid) {
      throw new BadRequestException('Booking must be paid before milestone rejection');
    }
    const milestone = await this.getMilestone(bookingId, milestoneId);

    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can reject milestones');
    }

    if (milestone.status === MilestoneStatus.APPROVED) {
      throw new BadRequestException('Approved milestones cannot be rejected');
    }

    const penaltySettings = await this.adminPenaltySettingsService.getCurrentSettings();
    const rejectionPenalty = this.getMilestoneRejectionPenalty(milestone, penaltySettings);

    milestone.status = MilestoneStatus.REJECTED;
    milestone.rejectionReason = reason;
    milestone.rejectedAt = new Date();
    milestone.metadata = {
      ...(milestone.metadata || {}),
      penaltyLog: [
        ...this.getPenaltyLog(milestone.metadata),
        ...(rejectionPenalty > 0
          ? [
              {
                type: 'provider_rejection',
                penaltyApplied: true,
                penaltyAmount: rejectionPenalty,
                mode: penaltySettings.providerRejectionPenaltyMode,
                reason,
                at: new Date().toISOString(),
              },
            ]
          : []),
      ],
      rejectionPenaltyApplied: rejectionPenalty > 0 ? true : this.getPenaltyLog(milestone.metadata).length > 0,
    };
    await this.milestoneRepository.save(milestone);

    await this.notificationOrchestratorService.notifyUser(booking.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_MILESTONE_REJECTED,
      title: 'Milestone rejected',
      body: `${booking.service?.title || 'Your booking'} milestone was rejected.`,
      data: {
        bookingId: booking.id,
        milestoneId,
      },
    });

    return this.listMilestones(bookingId, userId);
  }

  private async getAuthorizedBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId }, relations: ['service'] });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  private async getMilestone(bookingId: string, milestoneId: string): Promise<BookingMilestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, bookingId },
      relations: ['evidences'],
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return milestone;
  }

  private getBookingReleasableTotal(booking: Booking): number {
    const gross = Number(booking.amount || 0);
    const platformFee = Number(booking.platformFee || 0);
    return this.roundMoney(Math.max(gross - platformFee, 0));
  }

  private calculateProviderEvidencePenalty(
    booking: Booking,
    milestone: BookingMilestone,
    enabled: boolean,
    freeLimit: number,
    flatPenalty: number,
    percentPenalty: number,
    evidenceCountBefore: number,
  ): number {
    if (!enabled || evidenceCountBefore < freeLimit) {
      return 0;
    }

    return this.calculatePenaltyAmount(Number(milestone.estimatedAmount || booking.amount || 0), flatPenalty, percentPenalty);
  }

  private getMilestoneRejectionPenalty(
    milestone: BookingMilestone,
    settings: Awaited<ReturnType<AdminPenaltySettingsService['getCurrentSettings']>>,
  ): number {
    if (!settings.providerRejectionEnabled) {
      return 0;
    }

    const log = this.getPenaltyLog(milestone.metadata);
    if (settings.providerRejectionPenaltyMode === 'once_per_milestone' && log.some((entry) => entry.type === 'provider_rejection')) {
      return 0;
    }

    return this.calculatePenaltyAmount(
      Number(milestone.estimatedAmount || 0),
      Number(settings.providerRejectionFlatPenalty || 0),
      Number(settings.providerRejectionPercentPenalty || 0),
    );
  }

  private getMilestoneRejectionPenaltyTotal(
    milestone: BookingMilestone,
    settings: Awaited<ReturnType<AdminPenaltySettingsService['getCurrentSettings']>>,
  ): number {
    if (!settings.providerRejectionEnabled) {
      return 0;
    }

    const log = this.getPenaltyLog(milestone.metadata).filter((entry) => entry.type === 'provider_rejection');
    if (settings.providerRejectionPenaltyMode === 'once_per_milestone') {
      return log.length > 0 ? Number(log[0].penaltyAmount || 0) : 0;
    }

    return log.reduce((sum, entry) => sum + Number(entry.penaltyAmount || 0), 0);
  }

  private getEvidencePenaltyTotal(bookingId: string, milestoneId: string): Promise<number> {
    return this.evidenceRepository
      .find({ where: { bookingId, milestoneId } })
      .then((evidences) =>
        evidences.reduce((sum, evidence) => {
          const penaltyAmount = Number((evidence.metadata as Record<string, any> | undefined)?.penaltyAmount || 0);
          return sum + penaltyAmount;
        }, 0),
      );
  }

  private getPenaltyLog(metadata?: Record<string, any>): Array<Record<string, any>> {
    const penaltyLog = metadata?.penaltyLog;
    return Array.isArray(penaltyLog) ? penaltyLog : [];
  }

  private calculatePenaltyAmount(baseAmount: number, flatPenalty: number, percentPenalty: number): number {
    return this.roundMoney(Math.max(flatPenalty + baseAmount * (percentPenalty / 100), 0));
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private mapMilestone(milestone: BookingMilestone): BookingMilestoneResponseDto {
    return {
      id: milestone.id,
      bookingId: milestone.bookingId,
      createdBy: milestone.createdBy,
      title: milestone.title,
      description: milestone.description,
      percent: Number(milestone.percent),
      estimatedAmount: Number(milestone.estimatedAmount),
      status: milestone.status,
      sortOrder: milestone.sortOrder,
      submittedAt: milestone.submittedAt,
      approvedAt: milestone.approvedAt,
      rejectedAt: milestone.rejectedAt,
      rejectionReason: milestone.rejectionReason,
      evidenceCount: milestone.evidences?.length || 0,
      evidences: milestone.evidences?.map((evidence) => this.mapEvidence(evidence)),
    };
  }

  private mapEvidence(evidence: BookingMilestoneEvidence): BookingMilestoneEvidenceResponseDto {
    return {
      id: evidence.id,
      bookingId: evidence.bookingId,
      milestoneId: evidence.milestoneId,
      uploadedBy: evidence.uploadedBy,
      storagePath: evidence.storagePath,
      url: evidence.url,
      originalName: evidence.originalName,
      mimeType: evidence.mimeType,
      size: Number(evidence.size),
      note: evidence.note,
      externalUrl: evidence.externalUrl,
      createdAt: evidence.createdAt,
    };
  }
}
