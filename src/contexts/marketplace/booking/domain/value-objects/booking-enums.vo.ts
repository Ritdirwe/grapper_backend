export enum BookingStatus {
  PENDING = 'pending',
  PENDING_DEPOSIT = 'pending_deposit',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  REVISION_REQUESTED = 'revision_requested',
  PENDING_COMPLETION_PAYMENT = 'pending_completion_payment',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum MilestoneStatus {
  PROPOSED = 'proposed',
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DisputeReason {
  SERVICE_NOT_DELIVERED = 'service_not_delivered',
  POOR_QUALITY = 'poor_quality',
  LATE_DELIVERY = 'late_delivery',
  NOT_AS_DESCRIBED = 'not_as_described',
  PAYMENT_ISSUE = 'payment_issue',
  OTHER = 'other',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum CorrectionStatus {
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}
