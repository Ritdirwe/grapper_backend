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
import { FlutterwaveService } from '../../infrastructure/gateways/flutterwave.service';
import {
  CreatePayoutDto,
  PayoutResponseDto,
  ProviderBalanceDto,
} from '../dto/payout.dto';
import { PayoutProvider } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';
import { PayoutReleaseService } from './payout-release.service';

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    @InjectRepository(PayoutMethod)
    private payoutMethodRepository: Repository<PayoutMethod>,
    private paystackService: PaystackService,
    private flutterwaveService: FlutterwaveService,
    private payoutReleaseService: PayoutReleaseService,
    private dataSource: DataSource,
  ) {}

  async getProviderBalance(providerId: string): Promise<ProviderBalanceDto> {
    const totalReleased = await this.payoutReleaseService.getReleasedTotalForProvider(providerId);

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
      totalEarnings: totalReleased,
      availableBalance: totalReleased - totalPaidOut - totalPending,
      pendingPayouts: totalPending,
      completedPayouts: totalPaidOut,
      releasedAmount: totalReleased,
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

    const reloadedPayout = await this.payoutRepository.findOne({
      where: { id: payout.id },
      relations: ['payoutMethod'],
    });

    if (!reloadedPayout) {
      throw new NotFoundException('Created payout could not be reloaded');
    }

    if (
      reloadedPayout.payoutMethod &&
      [PayoutProvider.PAYSTACK, PayoutProvider.FLUTTERWAVE].includes(
        reloadedPayout.payoutMethod.provider,
      )
    ) {
      try {
        await this.processPayoutInternal(reloadedPayout);
      } catch {
        // Keep payout request record with failed status if processing fails.
      }
    }

    return this.mapToResponseDto(reloadedPayout, reloadedPayout.payoutMethod || payoutMethod);
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

    await this.processPayoutInternal(payout);

    return this.mapToResponseDto(payout, payout.payoutMethod);
  }

  private async processPayoutInternal(payout: Payout): Promise<void> {
    payout.markAsProcessing();
    await this.payoutRepository.save(payout);

    try {
      const transfer = await this.initiateGatewayTransfer(payout);

      payout.markAsCompleted(transfer.transferCode, {
        transferId: transfer.transferId,
        recipientCode: transfer.recipientCode,
        gateway: payout.payoutMethod.provider,
      });
      await this.payoutRepository.save(payout);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Transfer failed';
      payout.markAsFailed(errorMessage);
      await this.payoutRepository.save(payout);
      throw error;
    }
  }

  private async initiateGatewayTransfer(payout: Payout): Promise<{
    transferCode: string;
    transferId?: number | string;
    recipientCode?: string;
  }> {
    if (!payout.payoutMethod) {
      throw new BadRequestException('Payout method not found');
    }

    if (payout.payoutMethod.provider === PayoutProvider.PAYSTACK) {
      if (!payout.payoutMethod.accountNumber || !payout.payoutMethod.bankCode) {
        throw new BadRequestException('Paystack payout method is missing bank account details');
      }

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

      return {
        transferCode: transfer.transferCode,
        transferId: transfer.transferId,
        recipientCode: payout.payoutMethod.paystackRecipientCode,
      };
    }

    if (payout.payoutMethod.provider === PayoutProvider.FLUTTERWAVE) {
      if (!payout.payoutMethod.accountNumber || !payout.payoutMethod.bankCode) {
        throw new BadRequestException('Flutterwave payout method is missing bank account details');
      }

      const transfer = await this.flutterwaveService.initiateTransfer({
        amount: payout.amount,
        accountNumber: payout.payoutMethod.accountNumber,
        bankCode: payout.payoutMethod.bankCode,
        accountName: payout.payoutMethod.accountName,
        reference: payout.reference,
        currency: payout.currency,
        reason: `Payout for provider ${payout.providerId}`,
      });

      return {
        transferCode: transfer.transferCode,
        transferId: transfer.transferId,
        recipientCode: transfer.recipientCode,
      };
    }

    throw new BadRequestException(
      `Unsupported payout provider: ${payout.payoutMethod.provider}`,
    );
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

  async handleFlutterwavePayoutWebhook(payload: any, signature?: string): Promise<void> {
    this.flutterwaveService.verifyWebhookSignature(payload, signature);

    if (!payload || typeof payload !== 'object') {
      return;
    }

    const eventType = String(payload.type || '').toLowerCase();
    const data = payload.data || {};

    const reference =
      data.reference ||
      data.tx_ref ||
      data.transfer_reference ||
      data.id;

    if (!reference) {
      return;
    }

    const payout = await this.payoutRepository.findOne({
      where: { reference },
      relations: ['payoutMethod'],
    });

    if (!payout || [PayoutStatus.COMPLETED, PayoutStatus.CANCELLED].includes(payout.status)) {
      return;
    }

    if (eventType && !eventType.includes('transfer') && !eventType.includes('payout')) {
      return;
    }

    const verify = await this.flutterwaveService.verifyTransfer(reference);

    if (verify.success) {
      payout.markAsCompleted(reference, verify.gatewayResponse);
      await this.payoutRepository.save(payout);
      return;
    }

    payout.markAsFailed(`Flutterwave transfer verification failed: ${verify.status}`);
    await this.payoutRepository.save(payout);
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
