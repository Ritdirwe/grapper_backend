export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum PayoutProvider {
  STRIPE = 'stripe',
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  BANK_TRANSFER = 'bank_transfer',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}
