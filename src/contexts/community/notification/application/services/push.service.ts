import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken } from '../../domain/entities/push-token.entity';
import { RegisterTokenDto, BroadcastDto } from '../dto/notification.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushToken)
    private pushTokenRepository: Repository<PushToken>,
    private configService: ConfigService,
  ) {}

  async registerToken(userId: string, dto: RegisterTokenDto): Promise<void> {
    let pushToken = await this.pushTokenRepository.findOne({
      where: { userId, token: dto.token },
    });

    if (pushToken) {
      pushToken.active = true;
      if (dto.deviceId) pushToken.deviceId = dto.deviceId;
      await this.pushTokenRepository.save(pushToken);
      return;
    }

    pushToken = this.pushTokenRepository.create({
      userId,
      token: dto.token,
      platform: dto.platform || 'expo',
      deviceId: dto.deviceId,
      active: true,
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

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await this.pushTokenRepository.find({
      where: { userId, active: true },
    });

    if (tokens.length === 0) return;

    const pushTokens = tokens.map(t => t.token);
    return this.sendExpoNotifications(pushTokens, title, body, data);
  }

  async broadcast(dto: BroadcastDto) {
    const tokens = await this.pushTokenRepository.find({
      where: { active: true },
    });

    if (tokens.length === 0) return;

    const pushTokens = tokens.map(t => t.token);
    return this.sendExpoNotifications(pushTokens, dto.title, dto.message, dto.data);
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

      const result = await response.json();
      this.logger.log(`Push notification sent: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error sending push notification: ${error.message}`);
    }
  }
}
