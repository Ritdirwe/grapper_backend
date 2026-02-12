import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AdminBookingListResult,
  AdminDisputeListResult,
  AdminPaymentListResult,
  DashboardSnapshot,
  ExportEntity,
  PlatformReadContract,
  UsersWithProfilesResult,
} from '@shared/contracts/platform-read.contract';

@Injectable()
export class PlatformReadService implements PlatformReadContract {
  constructor(private dataSource: DataSource) {}

  async getDashboardSnapshot(
    todayStart: Date,
    monthStart: Date,
    activeUserStatus: string,
  ): Promise<DashboardSnapshot> {
    const [
      [{ count: totalUsers }],
      [{ count: activeUsers }],
      [{ count: newUsersToday }],
      [{ count: totalServices }],
      [{ count: activeServices }],
      [{ count: totalPosts }],
      [{ count: totalBookings }],
      [{ count: pendingBookings }],
      [{ count: inProgressBookings }],
      [{ count: completedBookings }],
      [{ count: disputedBookings }],
      [{ count: totalTransactions }],
      [{ total: totalTransactionVolume }],
      [{ total: pendingPayouts }],
      [{ total: completedPayouts }],
      revenueStats,
    ] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM users'),
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM users WHERE status = $1', [
        activeUserStatus,
      ]),
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM users WHERE created_at >= $1', [
        todayStart,
      ]),
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM services'),
      this.dataSource.query("SELECT COUNT(*)::int AS count FROM services WHERE status = 'active'"),
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM posts'),
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM bookings'),
      this.dataSource.query("SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'pending'"),
      this.dataSource.query(
        "SELECT COUNT(*)::int AS count FROM bookings WHERE status IN ('in_progress', 'revision_requested', 'delivered', 'pending_completion_payment')",
      ),
      this.dataSource.query("SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'completed'"),
      this.dataSource.query("SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'disputed'"),
      this.dataSource.query('SELECT COUNT(*)::int AS count FROM transactions'),
      this.dataSource.query('SELECT COALESCE(SUM(amount), 0) AS total FROM transactions'),
      this.dataSource.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM payouts WHERE status IN ('pending', 'processing')",
      ),
      this.dataSource.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM payouts WHERE status = 'completed'",
      ),
      this.dataSource
        .query(
          `SELECT
            COALESCE(SUM(amount), 0) AS total,
            COALESCE(SUM(CASE WHEN created_at >= $1 THEN amount ELSE 0 END), 0) AS today,
            COALESCE(SUM(CASE WHEN created_at >= $2 THEN amount ELSE 0 END), 0) AS month
          FROM bookings`,
          [todayStart, monthStart],
        )
        .then((rows) => rows[0] || { total: 0, today: 0, month: 0 }),
    ]);

    return {
      totalUsers: Number(totalUsers || 0),
      activeUsers: Number(activeUsers || 0),
      newUsersToday: Number(newUsersToday || 0),
      totalServices: Number(totalServices || 0),
      activeServices: Number(activeServices || 0),
      totalPosts: Number(totalPosts || 0),
      totalBookings: Number(totalBookings || 0),
      pendingBookings: Number(pendingBookings || 0),
      inProgressBookings: Number(inProgressBookings || 0),
      completedBookings: Number(completedBookings || 0),
      disputedBookings: Number(disputedBookings || 0),
      totalTransactions: Number(totalTransactions || 0),
      totalTransactionVolume: Number(totalTransactionVolume || 0),
      pendingPayouts: Number(pendingPayouts || 0),
      completedPayouts: Number(completedPayouts || 0),
      revenueTotal: Number(revenueStats?.total || 0),
      revenueToday: Number(revenueStats?.today || 0),
      revenueMonth: Number(revenueStats?.month || 0),
    };
  }

  async getUsersWithProfiles(page: number, limit: number): Promise<UsersWithProfilesResult> {
    const offset = (page - 1) * limit;
    const users = await this.dataSource.query(
      `SELECT
        u.*,
        p.id AS profile_id,
        p.full_name AS profile_full_name,
        p.display_name AS profile_display_name,
        p.avatar_url AS profile_avatar_url
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const [{ count: total }] = await this.dataSource.query('SELECT COUNT(*)::int AS count FROM users');

    return { users, total: Number(total || 0) };
  }

  async updateUserStatus(
    userId: string,
    status: string,
  ): Promise<Record<string, unknown> | undefined> {
    const updateResult = await this.dataSource
      .createQueryBuilder()
      .update('users')
      .set({ status })
      .where('id = :userId', { userId })
      .execute();

    if (!updateResult.affected) {
      return undefined;
    }

    const [user] = await this.dataSource.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    return user;
  }

  async deleteContent(targetType: 'post' | 'comment' | 'ad', targetId: string): Promise<void> {
    if (targetType === 'post') {
      await this.dataSource.query('DELETE FROM posts WHERE id = $1', [targetId]);
      return;
    }
    if (targetType === 'comment') {
      await this.dataSource.query('DELETE FROM comments WHERE id = $1', [targetId]);
      return;
    }
    await this.dataSource.query('DELETE FROM advertisements WHERE id = $1', [targetId]);
  }

  async serviceExists(serviceId: string): Promise<boolean> {
    const [service] = await this.dataSource.query('SELECT id FROM services WHERE id = $1 LIMIT 1', [
      serviceId,
    ]);
    return Boolean(service);
  }

  async updateServiceStatus(serviceId: string, status: string): Promise<void> {
    await this.dataSource.query('UPDATE services SET status = $1 WHERE id = $2', [status, serviceId]);
  }

  async deleteService(serviceId: string): Promise<void> {
    await this.dataSource.query('DELETE FROM services WHERE id = $1', [serviceId]);
  }

  async getUserGrowth(periodBucket: string): Promise<Record<string, unknown>[]> {
    return this.dataSource
      .createQueryBuilder()
      .from('users', 'user')
      .select("DATE_TRUNC('" + periodBucket + "', user.created_at)", 'date')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getRevenueAnalytics(periodBucket: string): Promise<Record<string, unknown>[]> {
    return this.dataSource
      .createQueryBuilder()
      .from('bookings', 'booking')
      .select("DATE_TRUNC('" + periodBucket + "', booking.created_at)", 'date')
      .addSelect('SUM(booking.amount)', 'revenue')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getServicePerformance(limit: number): Promise<Record<string, unknown>[]> {
    return this.dataSource
      .createQueryBuilder()
      .from('services', 'service')
      .select('service.title', 'title')
      .addSelect('service.total_orders', 'orders')
      .addSelect('service.average_rating', 'rating')
      .addSelect('service.view_count', 'views')
      .orderBy('service.total_orders', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async exportData(entity: ExportEntity): Promise<Record<string, unknown>[]> {
    if (entity === 'users') {
      return this.dataSource.query('SELECT * FROM users');
    }
    if (entity === 'bookings') {
      return this.dataSource.query('SELECT * FROM bookings');
    }
    return this.dataSource.query('SELECT * FROM services');
  }

  async getProviderCompletedJobsCount(userId: string, completedStatus: string): Promise<number> {
    const [{ count }] = await this.dataSource.query(
      'SELECT COUNT(*)::int AS count FROM bookings WHERE provider_id = $1 AND status = $2',
      [userId, completedStatus],
    );
    return Number(count || 0);
  }

  async getProviderTotalEarnings(userId: string, completedStatus: string): Promise<number> {
    const total = await this.dataSource
      .createQueryBuilder()
      .from('bookings', 'booking')
      .where('booking.provider_id = :userId', { userId })
      .andWhere('booking.status = :status', { status: completedStatus })
      .select('SUM(booking.amount)', 'total')
      .getRawOne();
    return Number(total?.total || 0);
  }

  async getClientTotalSpent(userId: string, completedStatus: string): Promise<number> {
    const total = await this.dataSource
      .createQueryBuilder()
      .from('bookings', 'booking')
      .where('booking.customer_id = :userId', { userId })
      .andWhere('booking.status = :status', { status: completedStatus })
      .select('SUM(booking.amount)', 'total')
      .getRawOne();
    return Number(total?.total || 0);
  }

  async getClientActiveContracts(userId: string, statuses: string[]): Promise<number> {
    const [{ count }] = await this.dataSource.query(
      'SELECT COUNT(*)::int AS count FROM bookings WHERE customer_id = $1 AND status IN ($2, $3)',
      [userId, statuses[0], statuses[1]],
    );
    return Number(count || 0);
  }

  async getClientMonthlySpending(
    userId: string,
    completedStatus: string,
  ): Promise<Record<string, unknown>[]> {
    return this.dataSource
      .createQueryBuilder()
      .from('bookings', 'booking')
      .where('booking.customer_id = :userId', { userId })
      .andWhere('booking.status = :status', { status: completedStatus })
      .select("TO_CHAR(booking.created_at, 'Mon')", 'month')
      .addSelect('SUM(booking.amount)', 'spending')
      .groupBy('month')
      .getRawMany();
  }

  async getProviderPendingClearance(userId: string, completedStatus: string): Promise<number> {
    const total = await this.dataSource
      .createQueryBuilder()
      .from('bookings', 'booking')
      .where('booking.provider_id = :userId', { userId })
      .andWhere('booking.status = :status', { status: completedStatus })
      .andWhere('booking.final_payment_paid = false')
      .select('SUM(booking.amount)', 'total')
      .getRawOne();
    return Number(total?.total || 0);
  }

  async getAdminBookings(
    page: number,
    limit: number,
    status?: string,
  ): Promise<AdminBookingListResult> {
    const offset = (page - 1) * limit;

    const values: any[] = [limit, offset];
    let whereClause = '';
    if (status) {
      whereClause = 'WHERE b.status = $3';
      values.push(status);
    }

    const bookings = await this.dataSource.query(
      `SELECT b.*, s.title AS service_title
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      values,
    );

    const countQuery = status
      ? `SELECT COUNT(*)::int AS count FROM bookings WHERE status = $1`
      : `SELECT COUNT(*)::int AS count FROM bookings`;
    const countValues = status ? [status] : [];
    const [{ count }] = await this.dataSource.query(countQuery, countValues);

    return {
      bookings,
      total: Number(count || 0),
    };
  }

  async getAdminBookingDetail(bookingId: string): Promise<Record<string, unknown> | undefined> {
    const rows = await this.dataSource.query(
      `SELECT b.*, s.title AS service_title
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId],
    );

    const booking = rows[0];
    if (!booking) {
      return undefined;
    }

    const transactions = await this.dataSource.query(
      `SELECT *
       FROM transactions
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [bookingId],
    );

    return {
      ...booking,
      transactions,
    };
  }

  async getAdminPayments(page: number, limit: number): Promise<AdminPaymentListResult> {
    const offset = (page - 1) * limit;
    const transactions = await this.dataSource.query(
      `SELECT *
       FROM transactions
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const [{ count }] = await this.dataSource.query('SELECT COUNT(*)::int AS count FROM transactions');
    return {
      transactions,
      total: Number(count || 0),
    };
  }

  async getAdminPaymentSummary(period: 'day' | 'week' | 'month'): Promise<Record<string, unknown>> {
    const [totals] = await this.dataSource.query(
      `SELECT
          COUNT(*)::int AS total_transactions,
          COALESCE(SUM(amount), 0) AS total_volume,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_transactions,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_transactions
       FROM transactions`,
    );

    const trend = await this.dataSource.query(
      `SELECT DATE_TRUNC($1, created_at) AS bucket, COALESCE(SUM(amount), 0) AS volume
       FROM transactions
       GROUP BY bucket
       ORDER BY bucket DESC
       LIMIT 12`,
      [period],
    );

    return {
      period,
      totals,
      trend,
    };
  }

  async getAdminDisputes(
    page: number,
    limit: number,
    status?: string,
  ): Promise<AdminDisputeListResult> {
    const offset = (page - 1) * limit;
    const values: any[] = [limit, offset];
    let whereClause = '';
    if (status) {
      whereClause = 'WHERE d.status = $3';
      values.push(status);
    }

    const disputes = await this.dataSource.query(
      `SELECT d.*, o.order_number
       FROM disputes d
       LEFT JOIN orders o ON o.id = d.order_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      values,
    );

    const countQuery = status
      ? `SELECT COUNT(*)::int AS count FROM disputes WHERE status = $1`
      : `SELECT COUNT(*)::int AS count FROM disputes`;
    const countValues = status ? [status] : [];
    const [{ count }] = await this.dataSource.query(countQuery, countValues);

    return {
      disputes,
      total: Number(count || 0),
    };
  }

  async resolveAdminDispute(
    disputeId: string,
    resolution: string,
    resolvedBy: string,
    adminNotes?: string,
    refundAmount?: number,
  ): Promise<boolean> {
    const updateResult = await this.dataSource.query(
      `UPDATE disputes
       SET status = 'resolved',
           resolution = $2,
           resolved_by = $3,
           admin_notes = $4,
           refund_amount = $5,
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [disputeId, resolution, resolvedBy, adminNotes || null, refundAmount ?? null],
    );

    return updateResult.length > 0;
  }

  async forceRefundBooking(bookingId: string): Promise<boolean> {
    const [booking] = await this.dataSource.query('SELECT * FROM bookings WHERE id = $1 LIMIT 1', [bookingId]);
    if (!booking) {
      return false;
    }

    await this.dataSource.query(
      `UPDATE transactions
       SET status = 'refunded',
           updated_at = NOW()
       WHERE booking_id = $1
         AND status = 'completed'`,
      [bookingId],
    );

    await this.dataSource.query(
      `UPDATE bookings
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId],
    );

    return true;
  }
}
