import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditAction, AnalyticsPeriod } from '../../domain/value-objects/reporting-enums.vo';
import { User } from '../../../identity/domain/entities/user.entity';
import { Service } from '../../../service-catalog/domain/entities/service.entity';
import { Booking } from '../../../booking/domain/entities/booking.entity';
import { BookingStatus } from '../../../booking/domain/value-objects/booking-enums.vo';
import { Advertisement } from '../../../advertisement/domain/entities/advertisement.entity';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Advertisement)
    private adRepository: Repository<Advertisement>,
  ) {}

  // Audit Logging
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

  // Advanced Analytics
  async getUserGrowth(period: AnalyticsPeriod): Promise<any> {
    const query = this.userRepository.createQueryBuilder('user')
      .select("DATE_TRUNC('" + this.mapPeriod(period) + "', user.created_at)", 'date')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('date')
      .orderBy('date', 'ASC');

    return query.getRawMany();
  }

  async getRevenueAnalytics(period: AnalyticsPeriod): Promise<any> {
    const query = this.bookingRepository.createQueryBuilder('booking')
      .select("DATE_TRUNC('" + this.mapPeriod(period) + "', booking.created_at)", 'date')
      .addSelect('SUM(booking.total_price)', 'revenue')
      .groupBy('date')
      .orderBy('date', 'ASC');

    return query.getRawMany();
  }

  async getServicePerformance(): Promise<any> {
    return this.serviceRepository.createQueryBuilder('service')
      .select('service.title', 'title')
      .addSelect('service.total_orders', 'orders')
      .addSelect('service.average_rating', 'rating')
      .addSelect('service.view_count', 'views')
      .orderBy('service.total_orders', 'DESC')
      .limit(10)
      .getRawMany();
  }

  // Export Framework (Generic)
  async exportData(entity: 'users' | 'bookings' | 'services'): Promise<string> {
    let data: any[];
    switch (entity) {
      case 'users':
        data = await this.userRepository.find();
        break;
      case 'bookings':
        data = await this.bookingRepository.find();
        break;
      case 'services':
        data = await this.serviceRepository.find();
        break;
    }

    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  // User Analytics
  async getPerformanceMetrics(userId: string, role: string): Promise<any> {
    const isProvider = role === 'provider';

    if (isProvider) {
      const totalJobs = await this.bookingRepository.count({
        where: { providerId: userId, status: BookingStatus.COMPLETED },
      });
      
      const totalEarnings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.providerId = :userId', { userId })
        .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
        .select('SUM(booking.amount)', 'total')
        .getRawOne();

      return {
        role: 'provider',
        providerMetrics: {
          totalJobsCompleted: totalJobs,
          totalEarnings: Number(totalEarnings?.total || 0),
          averageRating: 4.8, // Placeholder until reviews are linked
          completionRate: 98,
          onTimeDelivery: 95,
        },
      };
    } else {
      const totalSpent = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.customerId = :userId', { userId })
        .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
        .select('SUM(booking.amount)', 'total')
        .getRawOne();

        const activeContracts = await this.bookingRepository.count({
          where: { 
            customerId: userId, 
            status: Between(BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS)
          }
        });

      return {
        role: 'client',
        clientMetrics: {
          totalSpent: Number(totalSpent?.total || 0),
          activeContracts,
          jobsPosted: 12, // Placeholder
        }
      };
    }
  }

  async getClientSpending(userId: string): Promise<any> {
    const totalSpent = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.customerId = :userId', { userId })
        .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
        .select('SUM(booking.amount)', 'total')
        .getRawOne();
    
    // Monthly trend
    const monthly = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.customerId = :userId', { userId })
      .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
      .select("TO_CHAR(booking.created_at, 'Mon')", 'month')
      .addSelect('SUM(booking.amount)', 'spending')
      .groupBy('month')
      .getRawMany();

    return {
      totalSpent: Number(totalSpent?.total || 0),
      monthlyTrend: monthly,
    };
  }

  async getProviderEarnings(userId: string): Promise<any> {
    const totalEarnings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.providerId = :userId', { userId })
        .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
        .select('SUM(booking.amount)', 'total')
        .getRawOne();

    const pendingClearance = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.providerId = :userId', { userId })
      .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
      .andWhere('booking.finalPaymentPaid = false') // Assuming logic
      .select('SUM(booking.amount)', 'total')
      .getRawOne();
      
    return {
      totalEarnings: Number(totalEarnings?.total || 0),
      pendingClearance: Number(pendingClearance?.total || 0),
      availableForWithdrawal: Number(totalEarnings?.total || 0), // Simplification
    };
  }

  private mapPeriod(period: AnalyticsPeriod): string {
    switch (period) {
      case AnalyticsPeriod.DAILY: return 'day';
      case AnalyticsPeriod.WEEKLY: return 'week';
      case AnalyticsPeriod.MONTHLY: return 'month';
      case AnalyticsPeriod.YEARLY: return 'year';
      default: return 'day';
    }
  }
}
