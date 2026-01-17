import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Order } from '../../../booking/domain/entities/order.entity';
import { PaystackService } from '../../infrastructure/gateways/paystack.service';
import {
  TransactionType,
  TransactionStatus,
  PaymentGateway,
} from '../../domain/value-objects/payment-enums.vo';
import {
  InitializePaymentDto,
  VerifyPaymentDto,
  TransactionResponseDto,
  PaymentInitializationResponseDto,
} from '../dto/payment.dto';
import { OrderService } from '../../../booking/application/services/order.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private paystackService: PaystackService,
    private orderService: OrderService,
    private configService: ConfigService,
  ) {}

  async initializePayment(
    userId: string,
    dto: InitializePaymentDto,
  ): Promise<PaymentInitializationResponseDto> {
    // Validate order/booking exists
    if (dto.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: dto.orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.customerId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      // Use order amount if not specified
      if (!dto.amount) {
        dto.amount = order.amount;
      }
    }

    // Generate unique reference
    const reference = this.generateReference();

    // Create transaction record
    const transaction = this.transactionRepository.create({
      reference,
      userId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency || 'NGN',
      gateway: dto.gateway || PaymentGateway.PAYSTACK,
      orderId: dto.orderId,
      bookingId: dto.bookingId,
      description: dto.description,
      metadata: {
        email: dto.email,
      },
    });

    await this.transactionRepository.save(transaction);

    // Initialize payment with gateway
    const gateway = this.getGateway(transaction.gateway);
    const initResult = await gateway.initializePayment({
      amount: dto.amount,
      email: dto.email,
      reference,
      currency: dto.currency || 'NGN',
      metadata: {
        userId,
        orderId: dto.orderId,
        bookingId: dto.bookingId,
        type: dto.type,
      },
      callbackUrl: this.configService.get('payment.callbackUrl'),
    });

    // Update transaction with gateway info
    transaction.markAsProcessing();
    await this.transactionRepository.save(transaction);

    return {
      reference: initResult.reference,
      authorizationUrl: initResult.authorizationUrl,
      accessCode: initResult.accessCode,
    };
  }

  async verifyPayment(dto: VerifyPaymentDto): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findOne({
      where: { reference: dto.reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify with gateway
    const gateway = this.getGateway(transaction.gateway);
    const verifyResult = await gateway.verifyPayment(dto.reference);

    if (verifyResult.success) {
      // Mark transaction as completed
      transaction.markAsCompleted(
        verifyResult.gatewayReference,
        verifyResult.gatewayResponse,
      );
      await this.transactionRepository.save(transaction);

      // Update order if applicable
      if (transaction.orderId) {
        await this.orderService.markAsPaid(transaction.orderId, dto.reference);
      }
    } else {
      transaction.markAsFailed('Payment verification failed');
      await this.transactionRepository.save(transaction);
    }

    return this.mapToResponseDto(transaction);
  }

  async handleWebhook(payload: any, gateway: PaymentGateway): Promise<void> {
    // Paystack webhook handling
    if (gateway === PaymentGateway.PAYSTACK) {
      const event = payload.event;
      const data = payload.data;

      if (event === 'charge.success') {
        const transaction = await this.transactionRepository.findOne({
          where: { reference: data.reference },
        });

        if (transaction && transaction.status !== TransactionStatus.COMPLETED) {
          transaction.markAsCompleted(data.reference, data);
          await this.transactionRepository.save(transaction);

          // Update order
          if (transaction.orderId) {
            await this.orderService.markAsPaid(transaction.orderId, data.reference);
          }
        }
      }
    }
  }

  async getTransaction(reference: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    return this.mapToResponseDto(transaction);
  }

  async getUserTransactions(userId: string): Promise<TransactionResponseDto[]> {
    const transactions = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return transactions.map(t => this.mapToResponseDto(t));
  }

  private getGateway(gateway: PaymentGateway) {
    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        return this.paystackService;
      default:
        throw new BadRequestException('Unsupported payment gateway');
    }
  }

  private generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  private mapToResponseDto(transaction: Transaction): TransactionResponseDto {
    return {
      id: transaction.id,
      reference: transaction.reference,
      userId: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      gateway: transaction.gateway,
      gatewayReference: transaction.gatewayReference,
      orderId: transaction.orderId,
      bookingId: transaction.bookingId,
      description: transaction.description,
      paidAt: transaction.paidAt,
      failedAt: transaction.failedAt,
      failureReason: transaction.failureReason,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
