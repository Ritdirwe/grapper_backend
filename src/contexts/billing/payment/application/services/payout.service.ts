import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payout, PayoutStatus } from '../../domain/entities/payout.entity';
import { PayoutMethod } from '@contexts/identity/user-management/domain/entities/payout-method.entity';
import { PaystackService } from '../../infrastructure/gateways/paystack.service';
import {
  CreatePayoutDto,
  PayoutResponseDto,
  ProviderBalanceDto,
} from '../dto/payout.dto';

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    @InjectRepository(PayoutMethod)
    private payoutMethodRepository: Repository<PayoutMethod>,
    private paystackService: PaystackService,
    private dataSource: DataSource,
  ) {}

  async getProviderBalance(providerId: string): Promise<ProviderBalanceDto> {
    const completedOrders = await this.dataSource
      .createQueryBuilder()
      .from('orders', 'order')
      .where('order.provider_id = :providerId', { providerId })
      .andWhere('order.status = :status', { status: 'completed' })
      .select('SUM(order.provider_earnings)', 'total')
      .getRawOne();

    const totalEarnings = parseFloat(completedOrders?.total || '0');

    const completedPayouts = await this.payoutRepository
      .createQueryBuilder('payout')
      .where('payout.provider_id = :providerId', { providerId })
      .andWhere('payout.status = :status', { status: PayoutStatus.COMPLETED })
      .select('SUM(payout.amount)', 'total')
      .getRawOne();

    const totalPaidOut = parseFloat(completedPayouts?.total || '0');

    const pendingPayouts = await this.payoutRepository
      .createQueryBuilder('payout')
      .where('payout.provider_id = :providerId', { providerId })
      .andWhere('payout.status IN (:...statuses)', {
        statuses: [PayoutStatus.PENDING, PayoutStatus.PROCESSING],
      })
      .select('SUM(payout.amount)', 'total')
      .getRawOne();

    const totalPending = parseFloat(pendingPayouts?.total || '0');

    return {
      totalEarnings,
      availableBalance: totalEarnings - totalPaidOut - totalPending,
      pendingPayouts: totalPending,
      completedPayouts: totalPaidOut,
      currency: 'NGN',
    };
  }

  async createPayout(providerId: string, dto: CreatePayoutDto): Promise<PayoutResponseDto> {
    const balance = await this.getProviderBalance(providerId);

    if (dto.amount > balance.availableBalance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance.availableBalance}`,
      );
    }

    let payoutMethod: PayoutMethod;
    if (dto.payoutMethodId) {
      payoutMethod = await this.payoutMethodRepository.findOne({
        where: { id: dto.payoutMethodId, userId: providerId },
      });

      if (!payoutMethod) {
        throw new NotFoundException('Payout method not found');
      }
    } else {
      payoutMethod = await this.payoutMethodRepository.findOne({
        where: { userId: providerId, isDefault: true },
      });

      if (!payoutMethod) {
        throw new BadRequestException('No default payout method found');
      }
    }

    const reference = this.generateReference();

    const payout = this.payoutRepository.create({
      reference,
      providerId,
      payoutMethodId: payoutMethod.id,
      amount: dto.amount,
      currency: 'NGN',
      metadata: {
        payoutProvider: payoutMethod.provider,
        accountName: payoutMethod.accountName,
      },
    });

    await this.payoutRepository.save(payout);

    return this.mapToResponseDto(payout, payoutMethod);
  }

  async getProviderPayouts(providerId: string): Promise<PayoutResponseDto[]> {
    const payouts = await this.payoutRepository.find({
      where: { providerId },
      relations: ['payoutMethod'],
      order: { createdAt: 'DESC' },
    });

    return payouts.map((p) => this.mapToResponseDto(p, p.payoutMethod));
  }

  async getPayout(id: string, providerId: string): Promise<PayoutResponseDto> {
    const payout = await this.payoutRepository.findOne({
      where: { id },
      relations: ['payoutMethod'],
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.providerId !== providerId) {
      throw new BadRequestException('Unauthorized');
    }

    return this.mapToResponseDto(payout, payout.payoutMethod);
  }

  async processPayout(id: string): Promise<PayoutResponseDto> {
    const payout = await this.payoutRepository.findOne({
      where: { id },
      relations: ['payoutMethod'],
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Payout is not pending');
    }

    if (!payout.payoutMethod) {
      throw new BadRequestException('Payout method not found');
    }

    payout.markAsProcessing();
    await this.payoutRepository.save(payout);

    try {
      if (!payout.payoutMethod.paystackRecipientCode) {
        const recipient = await this.paystackService.createTransferRecipient({
          type: 'nuban',
          name: payout.payoutMethod.accountName,
          accountNumber: payout.payoutMethod.accountNumber,
          bankCode: payout.payoutMethod.bankCode,
          metadata: {
            userId: payout.providerId,
            payoutMethodId: payout.payoutMethodId,
          },
        });

        payout.payoutMethod.setPaystackRecipient(recipient.recipientCode);
        await this.payoutMethodRepository.save(payout.payoutMethod);
      }

      const transfer = await this.paystackService.initiateTransfer({
        amount: payout.amount,
        recipientCode: payout.payoutMethod.paystackRecipientCode,
        reference: payout.reference,
        reason: `Payout for provider ${payout.providerId}`,
      });

      payout.markAsCompleted(transfer.transferCode, {
        transferId: transfer.transferId,
        recipientCode: payout.payoutMethod.paystackRecipientCode,
      });
      await this.payoutRepository.save(payout);

      return this.mapToResponseDto(payout, payout.payoutMethod);
    } catch (error) {
      payout.markAsFailed(error.message || 'Transfer failed');
      await this.payoutRepository.save(payout);
      throw error;
    }
  }

  async cancelPayout(id: string, providerId: string): Promise<PayoutResponseDto> {
    const payout = await this.payoutRepository.findOne({
      where: { id },
      relations: ['payoutMethod'],
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.providerId !== providerId) {
      throw new BadRequestException('Unauthorized');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending payouts');
    }

    payout.cancel();
    await this.payoutRepository.save(payout);

    return this.mapToResponseDto(payout, payout.payoutMethod);
  }

  private generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAYOUT-${timestamp}-${random}`;
  }

  private mapToResponseDto(payout: Payout, payoutMethod?: PayoutMethod): PayoutResponseDto {
    return {
      id: payout.id,
      reference: payout.reference,
      providerId: payout.providerId,
      payoutMethodId: payout.payoutMethodId,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      gatewayReference: payout.gatewayReference,
      processedAt: payout.processedAt,
      failedAt: payout.failedAt,
      failureReason: payout.failureReason,
      payoutMethod: payoutMethod
        ? {
            id: payoutMethod.id,
            provider: payoutMethod.provider,
            accountName: payoutMethod.accountName,
            accountNumber: payoutMethod.accountNumber,
          }
        : undefined,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    };
  }
}
