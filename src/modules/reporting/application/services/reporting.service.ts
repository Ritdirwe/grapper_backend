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
