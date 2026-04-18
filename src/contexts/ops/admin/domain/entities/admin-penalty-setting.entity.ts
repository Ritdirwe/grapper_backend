import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';

export enum ProviderRejectionPenaltyMode {
  ONCE_PER_REJECTION = 'once_per_rejection',
  ONCE_PER_MILESTONE = 'once_per_milestone',
}

@Entity('admin_penalty_settings')
export class AdminPenaltySetting extends BaseEntity {
  @Column({ name: 'customer_correction_enabled', default: true })
  customerCorrectionEnabled: boolean;

  @Column({ name: 'customer_correction_free_limit', type: 'int', default: 3 })
  customerCorrectionFreeLimit: number;

  @Column({ name: 'customer_correction_flat_penalty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  customerCorrectionFlatPenalty: number;

  @Column({ name: 'customer_correction_percent_penalty', type: 'decimal', precision: 5, scale: 2, default: 0 })
  customerCorrectionPercentPenalty: number;

  @Column({ name: 'provider_evidence_enabled', default: true })
  providerEvidenceEnabled: boolean;

  @Column({ name: 'provider_evidence_free_limit', type: 'int', default: 3 })
  providerEvidenceFreeLimit: number;

  @Column({ name: 'provider_evidence_flat_penalty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  providerEvidenceFlatPenalty: number;

  @Column({ name: 'provider_evidence_percent_penalty', type: 'decimal', precision: 5, scale: 2, default: 0 })
  providerEvidencePercentPenalty: number;

  @Column({ name: 'provider_rejection_enabled', default: true })
  providerRejectionEnabled: boolean;

  @Column({ name: 'provider_rejection_flat_penalty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  providerRejectionFlatPenalty: number;

  @Column({ name: 'provider_rejection_percent_penalty', type: 'decimal', precision: 5, scale: 2, default: 0 })
  providerRejectionPercentPenalty: number;

  @Column({
    name: 'provider_rejection_penalty_mode',
    type: 'enum',
    enum: ProviderRejectionPenaltyMode,
    default: ProviderRejectionPenaltyMode.ONCE_PER_REJECTION,
  })
  providerRejectionPenaltyMode: ProviderRejectionPenaltyMode;
}
