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

export interface AdminOverviewTotals {
  users: number;
  profiles: number;
  posts: number;
  comments: number;
  services: number;
  ads: number;
  bookings: number;
  activeSessions: number;
}

export interface AdminDailyCountPoint {
  day: string;
  count: number;
}

export interface AdminDailySpendPoint {
  day: string;
  spend: number;
}

export interface AdminTopUniversityPoint {
  university: string;
  count: number;
}

export interface AdminOverviewResult {
  totals: AdminOverviewTotals;
  postsByDay: AdminDailyCountPoint[];
  commentsByDay: AdminDailyCountPoint[];
  spendByDay: AdminDailySpendPoint[];
  topUniversities: AdminTopUniversityPoint[];
}

export interface RecountPostCommentsResult {
  updatedPosts: number;
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

  getAdminOverview(): Promise<AdminOverviewResult>;
  recountPostComments(): Promise<RecountPostCommentsResult>;
}

export const PLATFORM_READ_CONTRACT = 'PLATFORM_READ_CONTRACT';
