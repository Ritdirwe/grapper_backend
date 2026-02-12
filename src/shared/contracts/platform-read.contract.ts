export type ExportEntity = 'users' | 'bookings' | 'services';

export interface DashboardSnapshot {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalServices: number;
  activeServices: number;
  totalPosts: number;
  totalBookings: number;
  revenueTotal: number;
  revenueToday: number;
  revenueMonth: number;
  pendingBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  disputedBookings: number;
  totalTransactions: number;
  totalTransactionVolume: number;
  pendingPayouts: number;
  completedPayouts: number;
}

export interface AdminBookingListResult {
  bookings: Record<string, unknown>[];
  total: number;
}

export interface AdminPaymentListResult {
  transactions: Record<string, unknown>[];
  total: number;
}

export interface AdminDisputeListResult {
  disputes: Record<string, unknown>[];
  total: number;
}

export interface UsersWithProfilesResult {
  users: Record<string, unknown>[];
  total: number;
}

export interface PlatformReadContract {
  getDashboardSnapshot(
    todayStart: Date,
    monthStart: Date,
    activeUserStatus: string,
  ): Promise<DashboardSnapshot>;
  getUsersWithProfiles(page: number, limit: number): Promise<UsersWithProfilesResult>;
  updateUserStatus(userId: string, status: string): Promise<Record<string, unknown> | undefined>;
  deleteContent(targetType: 'post' | 'comment' | 'ad', targetId: string): Promise<void>;
  serviceExists(serviceId: string): Promise<boolean>;
  updateServiceStatus(serviceId: string, status: string): Promise<void>;
  deleteService(serviceId: string): Promise<void>;

  getUserGrowth(periodBucket: string): Promise<Record<string, unknown>[]>;
  getRevenueAnalytics(periodBucket: string): Promise<Record<string, unknown>[]>;
  getServicePerformance(limit: number): Promise<Record<string, unknown>[]>;
  exportData(entity: ExportEntity): Promise<Record<string, unknown>[]>;

  getProviderCompletedJobsCount(userId: string, completedStatus: string): Promise<number>;
  getProviderTotalEarnings(userId: string, completedStatus: string): Promise<number>;
  getClientTotalSpent(userId: string, completedStatus: string): Promise<number>;
  getClientActiveContracts(userId: string, statuses: string[]): Promise<number>;
  getClientMonthlySpending(
    userId: string,
    completedStatus: string,
  ): Promise<Record<string, unknown>[]>;
  getProviderPendingClearance(userId: string, completedStatus: string): Promise<number>;

  getAdminBookings(page: number, limit: number, status?: string): Promise<AdminBookingListResult>;
  getAdminBookingDetail(bookingId: string): Promise<Record<string, unknown> | undefined>;
  getAdminPayments(page: number, limit: number): Promise<AdminPaymentListResult>;
  getAdminPaymentSummary(period: 'day' | 'week' | 'month'): Promise<Record<string, unknown>>;
  getAdminDisputes(page: number, limit: number, status?: string): Promise<AdminDisputeListResult>;
  resolveAdminDispute(
    disputeId: string,
    resolution: string,
    resolvedBy: string,
    adminNotes?: string,
    refundAmount?: number,
  ): Promise<boolean>;
  forceRefundBooking(bookingId: string): Promise<boolean>;
}

export const PLATFORM_READ_CONTRACT = 'PLATFORM_READ_CONTRACT';
