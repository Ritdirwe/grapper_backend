import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from '../../domain/entities/user-preferences.entity';
import { UpdatePreferencesDto } from '../dto/preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private preferencesRepository: Repository<UserPreferences>,
  ) {}

  async getOrCreatePreferences(userId: string): Promise<UserPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({ userId });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    return this.getOrCreatePreferences(userId);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const preferences = await this.getOrCreatePreferences(userId);

    Object.assign(preferences, dto);
    await this.preferencesRepository.save(preferences);

    return preferences;
  }

  async updateNotificationSettings(
    userId: string,
    settings: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
      marketingEmails?: boolean;
    },
  ): Promise<UserPreferences> {
    const preferences = await this.getOrCreatePreferences(userId);

    Object.assign(preferences, settings);
    await this.preferencesRepository.save(preferences);

    return preferences;
  }

  async updatePrivacySettings(
    userId: string,
    settings: {
      showOnlineStatus?: boolean;
      showProfileToSearch?: boolean;
      allowMessagesFromAnyone?: boolean;
    },
  ): Promise<UserPreferences> {
    const preferences = await this.getOrCreatePreferences(userId);

    Object.assign(preferences, settings);
    await this.preferencesRepository.save(preferences);

    return preferences;
  }
}
