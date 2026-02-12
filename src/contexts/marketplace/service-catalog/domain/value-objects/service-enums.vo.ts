export enum ServiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum PricingType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
  STARTING_AT = 'starting_at',
  NEGOTIABLE = 'negotiable',
}

export enum DeliveryType {
  REMOTE = 'remote',
  ON_SITE = 'on_site',
  BOTH = 'both',
}
