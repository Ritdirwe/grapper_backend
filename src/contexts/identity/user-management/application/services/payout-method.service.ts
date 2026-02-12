import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutMethod } from '../../domain/entities/payout-method.entity';
import { CreatePayoutMethodDto, PayoutMethodResponseDto } from '../dto/payout-method.dto';
import { PayoutProvider } from '../../domain/value-objects/user-enums.vo';

@Injectable()
export class PayoutMethodService {
  constructor(
    @InjectRepository(PayoutMethod)
    private payoutMethodRepository: Repository<PayoutMethod>,
  ) {}

  async getPayoutMethods(userId: string): Promise<PayoutMethodResponseDto[]> {
    const methods = await this.payoutMethodRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return methods.map(m => this.mapToResponseDto(m));
  }

  async getPayoutMethod(userId: string, id: string): Promise<PayoutMethodResponseDto> {
    const method = await this.payoutMethodRepository.findOne({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payout method not found');
    }

    return this.mapToResponseDto(method);
  }

  async createPayoutMethod(
    userId: string,
    dto: CreatePayoutMethodDto,
  ): Promise<PayoutMethodResponseDto> {
    // Validate required fields based on provider
    this.validatePayoutMethodData(dto);

    // If this is the first method, make it default
    const existingCount = await this.payoutMethodRepository.count({
      where: { userId },
    });

    const method = this.payoutMethodRepository.create({
      ...dto,
      userId,
      isDefault: existingCount === 0 || dto.isDefault,
    });

    // If setting as default, unset other defaults
    if (method.isDefault) {
      await this.payoutMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    await this.payoutMethodRepository.save(method);

    return this.mapToResponseDto(method);
  }

  async updatePayoutMethod(
    userId: string,
    id: string,
    dto: Partial<CreatePayoutMethodDto>,
  ): Promise<PayoutMethodResponseDto> {
    const method = await this.payoutMethodRepository.findOne({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payout method not found');
    }

    Object.assign(method, dto);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.payoutMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
      method.isDefault = true;
    }

    await this.payoutMethodRepository.save(method);

    return this.mapToResponseDto(method);
  }

  async deletePayoutMethod(userId: string, id: string): Promise<{ message: string }> {
    const method = await this.payoutMethodRepository.findOne({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payout method not found');
    }

    // If deleting default, set another one as default
    if (method.isDefault) {
      const otherMethod = await this.payoutMethodRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (otherMethod && otherMethod.id !== id) {
        otherMethod.isDefault = true;
        await this.payoutMethodRepository.save(otherMethod);
      }
    }

    await this.payoutMethodRepository.remove(method);

    return { message: 'Payout method deleted successfully' };
  }

  async setDefaultPayoutMethod(userId: string, id: string): Promise<PayoutMethodResponseDto> {
    const method = await this.payoutMethodRepository.findOne({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payout method not found');
    }

    // Unset other defaults
    await this.payoutMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    method.isDefault = true;
    await this.payoutMethodRepository.save(method);

    return this.mapToResponseDto(method);
  }

  async getDefaultPayoutMethod(userId: string): Promise<PayoutMethodResponseDto | null> {
    const method = await this.payoutMethodRepository.findOne({
      where: { userId, isDefault: true },
    });

    return method ? this.mapToResponseDto(method) : null;
  }

  private validatePayoutMethodData(dto: CreatePayoutMethodDto): void {
    switch (dto.provider) {
      case PayoutProvider.BANK_TRANSFER:
        if (!dto.accountNumber || !dto.bankName || !dto.bankCode) {
          throw new BadRequestException(
            'Bank transfer requires accountNumber, bankName, and bankCode',
          );
        }
        break;
      case PayoutProvider.STRIPE:
        if (!dto.stripeAccountId) {
          throw new BadRequestException('Stripe requires stripeAccountId');
        }
        break;
      case PayoutProvider.PAYSTACK:
        if (!dto.paystackRecipientCode) {
          throw new BadRequestException('Paystack requires paystackRecipientCode');
        }
        break;
    }
  }

  private mapToResponseDto(method: PayoutMethod): PayoutMethodResponseDto {
    return {
      id: method.id,
      userId: method.userId,
      provider: method.provider,
      accountName: method.accountName,
      accountNumber: method.accountNumber,
      bankName: method.bankName,
      bankCode: method.bankCode,
      currency: method.currency,
      isVerified: method.isVerified,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
      updatedAt: method.updatedAt,
    };
  }
}
