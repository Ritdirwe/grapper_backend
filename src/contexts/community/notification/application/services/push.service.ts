import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken } from '../../domain/entities/push-token.entity';
import { RegisterTokenDto, BroadcastDto, PushTokenResponseDto } from '../dto/notification.dto';
import { PushTokenPlatform } from '../../domain/value-objects/push-token-platform.vo';
import { ConfigService } from '@nestjs/config';
import { FirebaseMessagingService, FirebaseSendResult } from './firebase-messaging.service';

type ExpoResponseItem = {
  status?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type DeliveryResult = {
  expo?: ExpoResponseItem[] | null;
  fcm?: FirebaseSendResult[] | null;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushToken)
    private pushTokenRepository: Repository<PushToken>,
    private configService: ConfigService,
    private firebaseMessagingService: FirebaseMessagingService,
  ) {}

  async registerToken(userId: string, dto: RegisterTokenDto): Promise<void> {
    let pushToken = await this.pushTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (pushToken) {
      pushToken.userId = userId;
      pushToken.active = true;
      if (dto.deviceId) pushToken.deviceId = dto.deviceId;
      pushToken.lastUsedAt = new Date();
      pushToken.lastError = undefined;
      pushToken.failureCount = 0;
      await this.pushTokenRepository.save(pushToken);
      return;
    }

    pushToken = this.pushTokenRepository.create({
      userId,
      token: dto.token,
      platform: dto.platform || PushTokenPlatform.EXPO,
      deviceId: dto.deviceId,
      active: true,
      lastUsedAt: new Date(),
      failureCount: 0,
    });

    await this.pushTokenRepository.save(pushToken);
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    const pushToken = await this.pushTokenRepository.findOne({
      where: { userId, token },
    });

    if (pushToken) {
      pushToken.active = false;
      await this.pushTokenRepository.save(pushToken);
    }
  }

  async getTokens(userId: string): Promise<PushTokenResponseDto[]> {
    const tokens = await this.pushTokenRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return tokens.map(token => this.mapTokenResponse(token));
  }

  async removeToken(userId: string, tokenId: string): Promise<void> {
    const pushToken = await this.pushTokenRepository.findOne({
      where: { id: tokenId, userId },
    });

    if (!pushToken) {
      throw new NotFoundException('Push token not found');
    }

    await this.pushTokenRepository.remove(pushToken);
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await this.pushTokenRepository.find({
      where: { userId, active: true },
    });

    if (tokens.length === 0) return;

    return this.sendByPlatform(tokens, title, body, data);
  }

  async broadcast(dto: BroadcastDto) {
    const tokens = await this.pushTokenRepository.find({
      where: { active: true },
    });

    if (tokens.length === 0) return;

    return this.sendByPlatform(tokens, dto.title, dto.message, dto.data);
  }

  private async sendByPlatform(tokens: PushToken[], title: string, body: string, data?: Record<string, any>) {
    const expoTokens = tokens.filter(token => token.platform === PushTokenPlatform.EXPO).map(token => token.token);
    const fcmTokens = tokens.filter(token => token.platform === PushTokenPlatform.FCM).map(token => token.token);

    const results = await Promise.all([
      expoTokens.length > 0 ? this.sendExpoNotifications(expoTokens, title, body, data) : null,
      fcmTokens.length > 0 ? this.firebaseMessagingService.sendToMany(fcmTokens, { title, body, data }) : null,
    ]);

    await this.updateTokenTelemetry(tokens, results[0], results[1]);

    return {
      expo: results[0],
      fcm: results[1],
    };
  }

  private async sendExpoNotifications(tokens: string[], title: string, body: string, data?: Record<string, any>) {
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.configService.get('EXPO_ACCESS_TOKEN')}`,
        },
        body: JSON.stringify(messages),
      });

      const result = (await response.json()) as ExpoResponseItem[];
      this.logger.log(`Push notification sent: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error sending push notification: ${error.message}`);
    }
  }

  private async updateTokenTelemetry(
    tokens: PushToken[],
    expoResults: DeliveryResult['expo'],
    fcmResults: DeliveryResult['fcm'],
  ): Promise<void> {
    const expoTokenValues = tokens.filter(token => token.platform === PushTokenPlatform.EXPO).map(token => token.token);

    if (expoResults?.length) {
      expoResults.forEach((result, index) => {
        const tokenValue = expoTokenValues[index];
        if (tokenValue) {
          void this.applyTokenResult(tokenValue, result?.status === 'ok', result?.details?.error || result?.message);
        }
      });
    }

    if (fcmResults?.length) {
      fcmResults.forEach(result => {
        void this.applyTokenResult(result.token, result.success, result.error);
      });
    }
  }

  private async applyTokenResult(tokenValue: string, success: boolean, error?: string): Promise<void> {
    const pushToken = await this.pushTokenRepository.findOne({ where: { token: tokenValue } });
    if (!pushToken) {
      return;
    }

    pushToken.lastUsedAt = new Date();
    pushToken.lastError = success ? undefined : error || 'Notification delivery failed';
    pushToken.failureCount = success ? 0 : (pushToken.failureCount || 0) + 1;

    if (!success && this.isTerminalTokenError(error)) {
      pushToken.active = false;
    }

    await this.pushTokenRepository.save(pushToken);
  }

  private mapTokenResponse(token: PushToken): PushTokenResponseDto {
    return {
      id: token.id,
      token: token.token,
      platform: token.platform,
      deviceId: token.deviceId,
      active: token.active,
      lastUsedAt: token.lastUsedAt,
      lastError: token.lastError,
      failureCount: token.failureCount || 0,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }

  private isTerminalTokenError(error?: string): boolean {
    const lowered = (error || '').toLowerCase();
    return [
      'device not registered',
      'invalid registration token',
      'not registered',
      'unregistered',
      'messaging/registration-token-not-registered',
    ].some(fragment => lowered.includes(fragment));
  }
}
