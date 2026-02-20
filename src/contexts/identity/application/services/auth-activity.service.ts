import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthActivity } from '@contexts/identity/domain/entities/auth-activity.entity';
import { AuthActivityAction } from '@contexts/identity/domain/value-objects/auth-activity-action.vo';

export interface AuthActivityLogParams {
  action: AuthActivityAction;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuthActivityService {
  constructor(
    @InjectRepository(AuthActivity)
    private authActivityRepository: Repository<AuthActivity>,
  ) {}

  async log(params: AuthActivityLogParams): Promise<void> {
    try {
      const activity = this.authActivityRepository.create({
        action: params.action,
        userId: params.userId,
        email: params.email,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
      });
      await this.authActivityRepository.save(activity);
    } catch {
      // Never block auth flows on activity logging.
    }
  }
}
