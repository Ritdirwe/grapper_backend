import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private readonly app: admin.app.App | null;

  constructor(private readonly configService: ConfigService) {
    this.app = this.initializeApp();
  }

  async sendToToken(token: string, payload: NotificationPayload): Promise<string | null> {
    if (!this.app) {
      this.logger.warn('Firebase app is not configured, skipping FCM notification');
      return null;
    }

    try {
      const response = await this.app.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: this.normalizeData(payload.data),
      });

      this.logger.log(`Firebase notification sent: ${response}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Error sending Firebase notification: ${error?.message || error}`);
      return null;
    }
  }

  async sendToMany(tokens: string[], payload: NotificationPayload): Promise<(string | null)[]> {
    return Promise.all(tokens.map(token => this.sendToToken(token, payload)));
  }

  private initializeApp(): admin.app.App | null {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');
    const storageBucket = this.configService.get<string>('firebase.storageBucket');

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    if (admin.apps.length > 0) {
      return admin.app();
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      storageBucket,
    });
  }

  private normalizeData(data?: Record<string, any>): Record<string, string> | undefined {
    if (!data) return undefined;

    return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
      return acc;
    }, {});
  }
}
