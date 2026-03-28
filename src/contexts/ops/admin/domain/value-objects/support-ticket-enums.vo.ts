export enum SupportTicketCategory {
  PAYMENT = 'payment',
  ORDER = 'order',
  SERVICE = 'service',
  OTHER = 'other',
}

export enum SupportTicketStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  AWAITING_USER = 'awaiting_user',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SupportTicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SupportTicketSenderRole {
  USER = 'user',
  PROVIDER = 'provider',
  ADMIN = 'admin',
  SYSTEM = 'system',
}
