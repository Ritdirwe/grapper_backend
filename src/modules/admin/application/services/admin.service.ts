import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../../../identity/domain/entities/user.entity';
import { Profile } from '../../../user-management/domain/entities/profile.entity';
import { Service } from '../../../service-catalog/domain/entities/service.entity';
import { Booking } from '../../../booking/domain/entities/booking.entity';
import { Post } from '../../../social/domain/entities/post.entity';
import { Comment } from '../../../social/domain/entities/comment.entity';
import { Advertisement } from '../../../advertisement/domain/entities/advertisement.entity';
import { ModerationReport } from '../../domain/entities/moderation-report.entity';
import { SystemStatsDto, CreateReportDto, ResolveReportDto, ReportResponseDto } from '../dto/admin.dto';
import { ReportStatus, ModerationAction } from '../../domain/value-objects/moderation-enums.vo';
import { UserStatus } from '../../../identity/domain/value-objects/user-role.vo';
import { ServiceStatus } from '../../../service-catalog/domain/value-objects/service-enums.vo';
import { ReportingService } from '../../../reporting/application/services/reporting.service';
import { AuditAction } from '../../../reporting/domain/value-objects/reporting-enums.vo';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Advertisement)
    private adRepository: Repository<Advertisement>,
    @InjectRepository(ModerationReport)
    private reportRepository: Repository<ModerationReport>,
    private reportingService: ReportingService,
  ) {}

  // System Dashboard
  async getDashboardStats(): Promise<SystemStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalServices,
      activeServices,
      totalPosts,
      totalBookings,
      pendingReports,
      revenueStats
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { createdAt: Between(todayStart, new Date()) } }),
      this.serviceRepository.count(),
      this.serviceRepository.count({ where: { status: ServiceStatus.ACTIVE } }),
      this.postRepository.count(),
      this.bookingRepository.count(),
      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
      this.bookingRepository.createQueryBuilder('booking')
        .select('SUM(booking.total_price)', 'total')
        .addSelect("SUM(CASE WHEN booking.created_at >= :today THEN booking.total_price ELSE 0 END)", 'today')
        .addSelect("SUM(CASE WHEN booking.created_at >= :month THEN booking.total_price ELSE 0 END)", 'month')
        .setParameters({ today: todayStart, month: monthStart })
        .getRawOne()
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
      },
      services: {
        total: totalServices,
        active: activeServices,
      },
      revenue: {
        total: Number(revenueStats?.total || 0),
        today: Number(revenueStats?.today || 0),
        thisMonth: Number(revenueStats?.month || 0),
      },
      activity: {
        posts: totalPosts,
        bookings: totalBookings,
        reports: pendingReports,
      }
    };
  }

  // User Management
  async getUsers(page = 1, limit = 20): Promise<any> {
    const [users, total] = await this.userRepository.findAndCount({
      relations: ['profile'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { users, total };
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.status = status;
    await this.userRepository.save(user);

    // Audit Log
    await this.reportingService.log(
      'SYSTEM', // Ideally pass the actual admin ID here if available in the service call
      status === UserStatus.BANNED ? AuditAction.USER_BANNED : AuditAction.USER_SUSPENDED,
      'user',
      userId,
      { status }
    );

    return user;
  }

  // Content Moderation
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
    return { reports: reports.map(r => this.mapToReportDto(r)), total };
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

  // Admin Actions (Overrides)
  async deleteContent(targetType: string, targetId: string): Promise<void> {
    switch (targetType) {
      case 'post':
        await this.postRepository.delete(targetId);
        break;
      case 'comment':
        await this.commentRepository.delete(targetId);
        break;
      case 'ad':
        await this.adRepository.delete(targetId);
        break;
      default:
        throw new BadRequestException('Invalid target type');
    }

    // Audit Log
    await this.reportingService.log(
      'SYSTEM',
      AuditAction.CONTENT_DELETED,
      targetType,
      targetId
    );
  }

  async manageService(serviceId: string, action: 'activate' | 'deactivate' | 'delete'): Promise<void> {
    const service = await this.serviceRepository.findOne({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    if (action === 'activate') service.status = ServiceStatus.ACTIVE;
    else if (action === 'deactivate') service.status = ServiceStatus.PAUSED;
    else {
      await this.serviceRepository.remove(service);
      return;
    }
    await this.serviceRepository.save(service);
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
