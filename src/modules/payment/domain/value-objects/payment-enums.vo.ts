export enum TransactionType {
  ORDER_PAYMENT = 'order_payment',
  BOOKING_PAYMENT = 'booking_payment',
  REFUND = 'refund',
  PAYOUT = 'payout',
  WITHDRAWAL = 'withdrawal',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentGateway {
  PAYSTACK = 'paystack',
  STRIPE = 'stripe',
  FLUTTERWAVE = 'flutterwave',
}
