import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminPenaltySetting,
  ProviderRejectionPenaltyMode,
} from '../../domain/entities/admin-penalty-setting.entity';
import {
  AdminPenaltySettingsResponseDto,
  UpdateAdminPenaltySettingsDto,
} from '../dto/admin-penalty-settings.dto';

@Injectable()
export class AdminPenaltySettingsService {
  constructor(
    @InjectRepository(AdminPenaltySetting)
    private readonly settingsRepository: Repository<AdminPenaltySetting>,
  ) {}

  async getSettings(): Promise<AdminPenaltySettingsResponseDto> {
    const settings = await this.getOrCreateSettings();
    return this.mapToResponse(settings);
  }

  async updateSettings(dto: UpdateAdminPenaltySettingsDto): Promise<AdminPenaltySettingsResponseDto> {
    const settings = await this.getOrCreateSettings();
    Object.assign(settings, dto);
    await this.settingsRepository.save(settings);
    return this.mapToResponse(settings);
  }

  async getCurrentSettings(): Promise<AdminPenaltySetting> {
    return this.getOrCreateSettings();
  }

  private async getOrCreateSettings(): Promise<AdminPenaltySetting> {
    let settings = (await this.settingsRepository.find({ order: { createdAt: 'ASC' }, take: 1 }))[0];
    if (!settings) {
      settings = this.settingsRepository.create({
        customerCorrectionEnabled: true,
        customerCorrectionFreeLimit: 3,
        customerCorrectionFlatPenalty: 0,
        customerCorrectionPercentPenalty: 0,
        providerEvidenceEnabled: true,
        providerEvidenceFreeLimit: 3,
        providerEvidenceFlatPenalty: 0,
        providerEvidencePercentPenalty: 0,
        providerRejectionEnabled: true,
        providerRejectionFlatPenalty: 0,
        providerRejectionPercentPenalty: 0,
        providerRejectionPenaltyMode: ProviderRejectionPenaltyMode.ONCE_PER_REJECTION,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  private mapToResponse(settings: AdminPenaltySetting): AdminPenaltySettingsResponseDto {
    return {
      id: settings.id,
      customerCorrectionEnabled: settings.customerCorrectionEnabled,
      customerCorrectionFreeLimit: Number(settings.customerCorrectionFreeLimit || 0),
      customerCorrectionFlatPenalty: Number(settings.customerCorrectionFlatPenalty || 0),
      customerCorrectionPercentPenalty: Number(settings.customerCorrectionPercentPenalty || 0),
      providerEvidenceEnabled: settings.providerEvidenceEnabled,
      providerEvidenceFreeLimit: Number(settings.providerEvidenceFreeLimit || 0),
      providerEvidenceFlatPenalty: Number(settings.providerEvidenceFlatPenalty || 0),
      providerEvidencePercentPenalty: Number(settings.providerEvidencePercentPenalty || 0),
      providerRejectionEnabled: settings.providerRejectionEnabled,
      providerRejectionFlatPenalty: Number(settings.providerRejectionFlatPenalty || 0),
      providerRejectionPercentPenalty: Number(settings.providerRejectionPercentPenalty || 0),
      providerRejectionPenaltyMode: settings.providerRejectionPenaltyMode,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
