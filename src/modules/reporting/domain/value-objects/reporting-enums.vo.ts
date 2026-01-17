export enum AuditAction {
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
  CONTENT_DELETED = 'content_deleted',
  SERVICE_MODIFIED = 'service_modified',
  PLAN_MODIFIED = 'plan_modified',
  SETTINGS_CHANGED = 'settings_changed',
  ADMIN_LOGIN = 'admin_login',
}

export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}
