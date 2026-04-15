import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditAction, AnalyticsPeriod } from '../../domain/value-objects/reporting-enums.vo';
import { BookingStatus } from '@contexts/marketplace/booking/domain/value-objects/booking-enums.vo';
import {
  PLATFORM_READ_CONTRACT,
  PlatformReadContract,
  MobileDashboardResult,
  MobileDashboardRole,
} from '@shared/contracts/platform-read.contract';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @Inject(PLATFORM_READ_CONTRACT)
    private platformReadService: PlatformReadContract,
  ) {}

  async log(
    actorId: string,
    action: AuditAction,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      actorId,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress,
      userAgent,
    });
    return this.auditLogRepository.save(log);
  }

  async getAuditLogs(page = 1, limit = 20): Promise<any> {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { logs, total };
  }

  async getUserGrowth(period: AnalyticsPeriod): Promise<any> {
    return this.platformReadService.getUserGrowth(this.mapPeriod(period));
  }

  async getRevenueAnalytics(period: AnalyticsPeriod): Promise<any> {
    return this.platformReadService.getRevenueAnalytics(this.mapPeriod(period));
  }

  async getServicePerformance(): Promise<any> {
    return this.platformReadService.getServicePerformance(10);
  }

  async exportData(entity: 'users' | 'bookings' | 'services'): Promise<string> {
    const data = await this.platformReadService.exportData(entity);
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((item) =>
      Object.values(item)
        .map((val) => (typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val))
        .join(','),
    );

    return [headers, ...rows].join('\n');
  }

  async getPerformanceMetrics(userId: string, role: string): Promise<any> {
    const isProvider = role === 'provider';

    if (isProvider) {
      const totalJobs = await this.platformReadService.getProviderCompletedJobsCount(
        userId,
        BookingStatus.COMPLETED,
      );

      const totalEarnings = await this.platformReadService.getProviderTotalEarnings(
        userId,
        BookingStatus.COMPLETED,
      );

      return {
        role: 'provider',
        providerMetrics: {
          totalJobsCompleted: totalJobs,
          totalEarnings,
          averageRating: 4.8,
          completionRate: 98,
          onTimeDelivery: 95,
        },
      };
    }

    const totalSpent = await this.platformReadService.getClientTotalSpent(
      userId,
      BookingStatus.COMPLETED,
    );

    const activeContracts = await this.platformReadService.getClientActiveContracts(userId, [
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ]);

    return {
      role: 'client',
      clientMetrics: {
        totalSpent,
        activeContracts,
        jobsPosted: 12,
      },
    };
  }

  async getMobileDashboard(userId: string, role: MobileDashboardRole): Promise<MobileDashboardResult> {
    return this.platformReadService.getMobileDashboard(userId, role);
  }

  async getClientSpending(userId: string): Promise<any> {
    const totalSpent = await this.platformReadService.getClientTotalSpent(
      userId,
      BookingStatus.COMPLETED,
    );

    const monthly = await this.platformReadService.getClientMonthlySpending(
      userId,
      BookingStatus.COMPLETED,
    );

    return {
      totalSpent,
      monthlyTrend: monthly,
    };
  }

  async getProviderEarnings(userId: string): Promise<any> {
    const totalEarnings = await this.platformReadService.getProviderTotalEarnings(
      userId,
      BookingStatus.COMPLETED,
    );

    const pendingClearance = await this.platformReadService.getProviderPendingClearance(
      userId,
      BookingStatus.COMPLETED,
    );

    return {
      totalEarnings,
      pendingClearance,
      availableForWithdrawal: totalEarnings,
    };
  }

  private mapPeriod(period: AnalyticsPeriod): string {
    switch (period) {
      case AnalyticsPeriod.DAILY:
        return 'day';
      case AnalyticsPeriod.WEEKLY:
        return 'week';
      case AnalyticsPeriod.MONTHLY:
        return 'month';
      case AnalyticsPeriod.YEARLY:
        return 'year';
      default:
        return 'day';
    }
  }
}
