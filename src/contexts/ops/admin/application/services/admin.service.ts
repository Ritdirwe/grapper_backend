import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationReport } from '../../domain/entities/moderation-report.entity';
import { Review } from '@contexts/marketplace/reviews/domain/entities/review.entity';
import {
  AdminBookingListDto,
  AdminBookingsQueryDto,
  AdminReviewListDto,
  AdminReviewsQueryDto,
  AdminDisputeListDto,
  AdminPaymentListDto,
  CreateReportDto,
  ReportResponseDto,
  AdminUpdateBookingStatusDto,
  ResolveDisputeAdminDto,
  ResolveReportDto,
  SystemStatsDto,
} from '../dto/admin.dto';
import { ReportStatus } from '../../domain/value-objects/moderation-enums.vo';
import { UserStatus } from '@contexts/identity/domain/value-objects/user-role.vo';
import { ReportingService } from '@contexts/ops/reporting/application/services/reporting.service';
import { AuditAction } from '@contexts/ops/reporting/domain/value-objects/reporting-enums.vo';
import {
  PLATFORM_READ_CONTRACT,
  PlatformReadContract,
} from '@shared/contracts/platform-read.contract';
import type {
  AdminOverviewResult,
  RecountPostCommentsResult,
} from '@shared/contracts/platform-read.contract';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(ModerationReport)
    private reportRepository: Repository<ModerationReport>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private reportingService: ReportingService,
    @Inject(PLATFORM_READ_CONTRACT)
    private platformReadService: PlatformReadContract,
  ) {}

  async getDashboardStats(): Promise<SystemStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [snapshot, pendingReports] = await Promise.all([
      this.platformReadService.getDashboardSnapshot(todayStart, monthStart, UserStatus.ACTIVE),
      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
    ]);

    return {
      users: {
        total: snapshot.totalUsers,
        active: snapshot.activeUsers,
        newToday: snapshot.newUsersToday,
      },
      services: {
        total: snapshot.totalServices,
        active: snapshot.activeServices,
      },
      revenue: {
        total: snapshot.revenueTotal,
        today: snapshot.revenueToday,
        thisMonth: snapshot.revenueMonth,
      },
      activity: {
        posts: snapshot.totalPosts,
        bookings: snapshot.totalBookings,
        reports: pendingReports,
      },
      bookings: {
        total: snapshot.totalBookings,
        pending: snapshot.pendingBookings,
        inProgress: snapshot.inProgressBookings,
        completed: snapshot.completedBookings,
        disputed: snapshot.disputedBookings,
      },
      payments: {
        totalTransactions: snapshot.totalTransactions,
        totalVolume: snapshot.totalTransactionVolume,
        pendingPayouts: snapshot.pendingPayouts,
        completedPayouts: snapshot.completedPayouts,
      },
    };
  }

  async getBookings(query: AdminBookingsQueryDto = {}): Promise<AdminBookingListDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const status = query.status;
    const search = query.search;
    return this.platformReadService.getAdminBookings(page, limit, status, search);
  }

  async getBookingDetail(bookingId: string): Promise<Record<string, unknown>> {
    const booking = await this.platformReadService.getAdminBookingDetail(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateBookingStatus(
    adminId: string,
    bookingId: string,
    dto: AdminUpdateBookingStatusDto,
  ): Promise<void> {
    const updated = await this.platformReadService.updateAdminBookingStatus(
      bookingId,
      dto.status,
      adminId,
      dto.reason,
    );
    if (!updated) {
      throw new NotFoundException('Booking not found');
    }

    await this.reportingService.log(
      adminId,
      AuditAction.BOOKING_STATUS_CHANGED,
      'booking',
      bookingId,
      { status: dto.status, reason: dto.reason },
    );
  }

  async getPayments(page = 1, limit = 20): Promise<AdminPaymentListDto> {
    return this.platformReadService.getAdminPayments(page, limit);
  }

  async getPaymentSummary(period: 'day' | 'week' | 'month' = 'month'): Promise<Record<string, unknown>> {
    return this.platformReadService.getAdminPaymentSummary(period);
  }

  async getDisputes(page = 1, limit = 20, status?: string): Promise<AdminDisputeListDto> {
    return this.platformReadService.getAdminDisputes(page, limit, status);
  }

  async getDisputeDetail(disputeId: string): Promise<Record<string, unknown>> {
    const detail = await this.platformReadService.getAdminDisputeDetail(disputeId);
    if (!detail) {
      throw new NotFoundException('Dispute not found');
    }
    return detail;
  }

  async resolveDispute(adminId: string, disputeId: string, dto: ResolveDisputeAdminDto): Promise<void> {
    const resolved = await this.platformReadService.resolveAdminDispute(
      disputeId,
      dto.resolution,
      adminId,
      dto.adminNotes,
      dto.refundAmount,
    );

    if (!resolved) {
      throw new NotFoundException('Dispute not found');
    }
  }

  async forceRefundBooking(bookingId: string): Promise<void> {
    const refunded = await this.platformReadService.forceRefundBooking(bookingId);
    if (!refunded) {
      throw new NotFoundException('Booking not found');
    }
  }

  async getOverview(): Promise<AdminOverviewResult> {
    return this.platformReadService.getAdminOverview();
  }

  async recountComments(): Promise<RecountPostCommentsResult> {
    return this.platformReadService.recountPostComments();
  }

  async getUsers(page = 1, limit = 20): Promise<any> {
    return this.platformReadService.getUsersWithProfiles(page, limit);
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<any> {
    const user = await this.platformReadService.updateUserStatus(userId, status);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.reportingService.log(
      'SYSTEM',
      status === UserStatus.BANNED ? AuditAction.USER_BANNED : AuditAction.USER_SUSPENDED,
      'user',
      userId,
      { status },
    );

    return user;
  }

  async reportContent(reporterId: string, dto: CreateReportDto): Promise<ReportResponseDto> {
    const report = this.reportRepository.create({
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      description: dto.description,
    });
    await this.reportRepository.save(report);
    return this.mapToReportDto(report);
  }

  async getReports(status?: ReportStatus, page = 1, limit = 20): Promise<any> {
    const where = status ? { status } : {};
    const [reports, total] = await this.reportRepository.findAndCount({
      where,
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { reports: reports.map((r) => this.mapToReportDto(r)), total };
  }

  async resolveReport(adminId: string, reportId: string, dto: ResolveReportDto): Promise<ReportResponseDto> {
    const report = await this.reportRepository.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = dto.status;
    report.resolutionNotes = dto.resolutionNotes;
    report.resolvedById = adminId;
    report.resolvedAt = new Date();

    await this.reportRepository.save(report);
    return this.mapToReportDto(report);
  }

  async getReviews(query: AdminReviewsQueryDto = {}): Promise<AdminReviewListDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: query.reviewType ? { reviewType: query.reviewType as any } : {},
      relations: ['user', 'service', 'booking'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { reviews: reviews as unknown as Record<string, unknown>[], total };
  }

  async deleteContent(actorId: string, targetType: string, targetId: string): Promise<void> {
    switch (targetType) {
      case 'post':
        await this.platformReadService.deleteContent('post', targetId);
        break;
      case 'comment':
        await this.platformReadService.deleteContent('comment', targetId);
        break;
      case 'ad':
        await this.platformReadService.deleteContent('ad', targetId);
        break;
      case 'review':
        await this.reviewRepository.delete(targetId);
        break;
      default:
        throw new BadRequestException('Invalid target type');
    }

    await this.reportingService.log(
      actorId,
      AuditAction.CONTENT_DELETED,
      targetType,
      targetId,
    );
  }

  async manageService(serviceId: string, action: 'activate' | 'deactivate' | 'delete'): Promise<void> {
    const exists = await this.platformReadService.serviceExists(serviceId);
    if (!exists) throw new NotFoundException('Service not found');

    if (action === 'activate') {
      await this.platformReadService.updateServiceStatus(serviceId, 'active');
    } else if (action === 'deactivate') {
      await this.platformReadService.updateServiceStatus(serviceId, 'paused');
    } else {
      await this.platformReadService.deleteService(serviceId);
    }
  }

  private mapToReportDto(report: ModerationReport): ReportResponseDto {
    return {
      id: report.id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      resolvedById: report.resolvedById,
      resolutionNotes: report.resolutionNotes,
      resolvedAt: report.resolvedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
