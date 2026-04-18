import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPaymentMethod } from '../../domain/entities/saved-payment-method.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { PaymentGateway } from '../../domain/value-objects/payment-enums.vo';
import { SavedPaymentMethodResponseDto } from '../dto/saved-payment-method.dto';

@Injectable()
export class SavedPaymentMethodService {
  constructor(
    @InjectRepository(SavedPaymentMethod)
    private savedPaymentMethodRepository: Repository<SavedPaymentMethod>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async findByUser(userId: string): Promise<SavedPaymentMethodResponseDto[]> {
    const methods = await this.savedPaymentMethodRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return methods.map((method) => this.mapToResponseDto(method));
  }

  async findPreferred(userId: string): Promise<SavedPaymentMethod | null> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (profile?.preferredSavedPaymentMethodId) {
      const preferred = await this.savedPaymentMethodRepository.findOne({
        where: { id: profile.preferredSavedPaymentMethodId, userId },
      });

      if (preferred) {
        return preferred;
      }

      profile.preferredSavedPaymentMethodId = undefined;
      await this.profileRepository.save(profile);
    }

    return this.savedPaymentMethodRepository.findOne({
      where: { userId, isDefault: true },
    });
  }

  async getById(userId: string, id: string): Promise<SavedPaymentMethod> {
    const method = await this.savedPaymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Saved payment method not found');
    }

    return method;
  }

  async saveFromGateway(userId: string, input: {
    gateway: PaymentGateway;
    providerAuthorizationId: string;
    authorizationCode?: string;
    cardBrand?: string;
    last4?: string;
    expiryMonth?: string;
    expiryYear?: string;
    metadata?: Record<string, any>;
    isDefault?: boolean;
  }): Promise<SavedPaymentMethod> {
    if (!input.providerAuthorizationId) {
      throw new BadRequestException('providerAuthorizationId is required');
    }

    const existingCount = await this.savedPaymentMethodRepository.count({ where: { userId } });

    let method = await this.savedPaymentMethodRepository.findOne({
      where: {
        gateway: input.gateway,
        providerAuthorizationId: input.providerAuthorizationId,
        userId,
      },
    });

    if (!method) {
      method = this.savedPaymentMethodRepository.create({
        userId,
        gateway: input.gateway,
        providerAuthorizationId: input.providerAuthorizationId,
        authorizationCode: input.authorizationCode,
        cardBrand: input.cardBrand,
        last4: input.last4,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        metadata: input.metadata,
        isReusable: true,
        isDefault: input.isDefault !== undefined ? input.isDefault : existingCount === 0,
      });
    } else {
      method.authorizationCode = input.authorizationCode || method.authorizationCode;
      method.cardBrand = input.cardBrand || method.cardBrand;
      method.last4 = input.last4 || method.last4;
      method.expiryMonth = input.expiryMonth || method.expiryMonth;
      method.expiryYear = input.expiryYear || method.expiryYear;
      method.metadata = {
        ...(method.metadata || {}),
        ...(input.metadata || {}),
      };
      method.isReusable = true;
      if (input.isDefault !== undefined) {
        method.isDefault = input.isDefault;
      }
      if (input.isDefault === undefined && existingCount === 0) {
        method.isDefault = true;
      }
    }

    if (method.isDefault) {
      await this.savedPaymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const saved = await this.savedPaymentMethodRepository.save(method);

    if (saved.isDefault) {
      await this.syncPreferredProfileMethod(userId, saved.id);
    }

    return saved;
  }

  async setPreferred(userId: string, id: string): Promise<SavedPaymentMethodResponseDto> {
    const method = await this.getById(userId, id);

    await this.savedPaymentMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    method.isDefault = true;
    await this.savedPaymentMethodRepository.save(method);
    await this.syncPreferredProfileMethod(userId, method.id);

    return this.mapToResponseDto(method);
  }

  async delete(userId: string, id: string): Promise<{ message: string }> {
    const method = await this.getById(userId, id);
    const wasDefault = method.isDefault;

    await this.savedPaymentMethodRepository.remove(method);

    if (wasDefault) {
      const replacement = await this.savedPaymentMethodRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (replacement) {
        replacement.isDefault = true;
        await this.savedPaymentMethodRepository.save(replacement);
        await this.syncPreferredProfileMethod(userId, replacement.id);
      } else {
        await this.syncPreferredProfileMethod(userId, null);
      }
    }

    return { message: 'Saved payment method deleted successfully' };
  }

  private async syncPreferredProfileMethod(userId: string, methodId: string | null): Promise<void> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      return;
    }

    profile.preferredSavedPaymentMethodId = methodId || undefined;
    await this.profileRepository.save(profile);
  }

  private mapToResponseDto(method: SavedPaymentMethod): SavedPaymentMethodResponseDto {
    return {
      id: method.id,
      userId: method.userId,
      gateway: method.gateway,
      cardBrand: method.cardBrand,
      last4: method.last4,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      isReusable: method.isReusable,
      isDefault: method.isDefault,
      metadata: method.metadata,
      createdAt: method.createdAt,
      updatedAt: method.updatedAt,
    };
  }
}
