import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payout, PayoutStatus } from '../../domain/entities/payout.entity';
import { Order } from '../../../booking/domain/entities/order.entity';
import { PayoutMethod } from '../../../user-management/domain/entities/payout-method.entity';
import { OrderStatus } from '../../../booking/domain/value-objects/booking-enums.vo';
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
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(PayoutMethod)
    private payoutMethodRepository: Repository<PayoutMethod>,
    private configService: ConfigService,
    private paystackService: PaystackService,
  ) {}

  async getProviderBalance(providerId: string): Promise<ProviderBalanceDto> {
    // Calculate total earnings from completed orders
    const completedOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.provider_id = :providerId', { providerId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .select('SUM(order.provider_earnings)', 'total')
      .getRawOne();

    const totalEarnings = parseFloat(completedOrders?.total || '0');

    // Calculate total completed payouts
    const completedPayouts = await this.payoutRepository
      .createQueryBuilder('payout')
      .where('payout.provider_id = :providerId', { providerId })
      .andWhere('payout.status = :status', { status: PayoutStatus.COMPLETED })
      .select('SUM(payout.amount)', 'total')
      .getRawOne();

    const totalPaidOut = parseFloat(completedPayouts?.total || '0');

    // Calculate pending payouts
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
    // Check available balance
    const balance = await this.getProviderBalance(providerId);

    if (dto.amount > balance.availableBalance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance.availableBalance}`,
      );
    }

    // Get payout method
    let payoutMethod: PayoutMethod;
    if (dto.payoutMethodId) {
      payoutMethod = await this.payoutMethodRepository.findOne({
        where: { id: dto.payoutMethodId, userId: providerId },
      });

      if (!payoutMethod) {
        throw new NotFoundException('Payout method not found');
      }
    } else {
      // Use default payout method
      payoutMethod = await this.payoutMethodRepository.findOne({
        where: { userId: providerId, isDefault: true },
      });

      if (!payoutMethod) {
        throw new BadRequestException('No default payout method found');
      }
    }

    // Generate reference
    const reference = this.generateReference();

    // Create payout
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

    return payouts.map(p => this.mapToResponseDto(p, p.payoutMethod));
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

    // Mark as processing
    payout.markAsProcessing();
    await this.payoutRepository.save(payout);

    try {
      // Create Paystack transfer recipient if not exists
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

        // Save recipient code
        payout.payoutMethod.setPaystackRecipient(recipient.recipientCode);
        await this.payoutMethodRepository.save(payout.payoutMethod);
      }

      // Initiate transfer via Paystack
      const transfer = await this.paystackService.initiateTransfer({
        amount: payout.amount,
        recipientCode: payout.payoutMethod.paystackRecipientCode,
        reference: payout.reference,
        reason: `Payout for provider ${payout.providerId}`,
      });

      // Mark as completed
      payout.markAsCompleted(transfer.transferCode, {
        transferId: transfer.transferId,
        recipientCode: payout.payoutMethod.paystackRecipientCode,
      });
      await this.payoutRepository.save(payout);

      return this.mapToResponseDto(payout, payout.payoutMethod);
    } catch (error) {
      // Mark as failed
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
