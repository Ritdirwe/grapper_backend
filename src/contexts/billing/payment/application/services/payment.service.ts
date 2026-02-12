import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction } from '../../domain/entities/transaction.entity';
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

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async initializePayment(
    userId: string,
    dto: InitializePaymentDto,
  ): Promise<PaymentInitializationResponseDto> {
    if (dto.orderId) {
      const [order] = await this.dataSource.query(
        'SELECT id, customer_id, amount FROM orders WHERE id = $1 LIMIT 1',
        [dto.orderId],
      );

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.customer_id !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      if (!dto.amount) {
        dto.amount = Number(order.amount);
      }
    }

    const reference = this.generateReference();

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

    const gateway = this.getGateway(transaction.gateway);
    const verifyResult = await gateway.verifyPayment(dto.reference);

    if (verifyResult.success) {
      transaction.markAsCompleted(
        verifyResult.gatewayReference,
        verifyResult.gatewayResponse,
      );
      await this.transactionRepository.save(transaction);

      if (transaction.orderId) {
        await this.markOrderAsPaid(transaction.orderId, dto.reference);
      }
    } else {
      transaction.markAsFailed('Payment verification failed');
      await this.transactionRepository.save(transaction);
    }

    return this.mapToResponseDto(transaction);
  }

  async handleWebhook(payload: any, gateway: PaymentGateway): Promise<void> {
    if (gateway === PaymentGateway.PAYSTACK) {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      const event = payload.event;
      const data = payload.data;

      if (!event || !data) {
        return;
      }

      if (event === 'charge.success') {
        const transaction = await this.transactionRepository.findOne({
          where: { reference: data.reference },
        });

        if (transaction && transaction.status !== TransactionStatus.COMPLETED) {
          transaction.markAsCompleted(data.reference, data);
          await this.transactionRepository.save(transaction);

          if (transaction.orderId) {
            await this.markOrderAsPaid(transaction.orderId, data.reference);
          }

          if (transaction.bookingId) {
            await this.handleBookingPaymentByType(transaction.bookingId, transaction.type, data.reference);
          }
        }

        if (!transaction) {
          await this.handleBookingPaymentByReference(data.reference);
        }
      }
    }
  }

  private async handleBookingPaymentByType(
    bookingId: string,
    type: TransactionType,
    reference: string,
  ): Promise<void> {
    if (type === TransactionType.BOOKING_PAYMENT) {
      await this.markBookingDepositAsPaid(bookingId, reference);
    }
  }

  private async handleBookingPaymentByReference(reference: string): Promise<void> {
    if (reference.endsWith('-completion')) {
      const baseReference = reference.replace(/-completion$/, '');
      await this.markBookingCompletionAsPaid(baseReference, reference);
      return;
    }

    if (reference.includes('-correction-')) {
      const baseReference = reference.replace(/-correction-\d+$/, '');
      await this.markCorrectionAsPaid(baseReference, reference);
      return;
    }

    await this.markBookingDepositAsPaidByReference(reference);
  }

  private async markBookingDepositAsPaid(bookingId: string, paymentReference: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE bookings
       SET deposit_paid = true,
           status = 'pending',
           paystack_reference = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, paymentReference],
    );
  }

  private async markBookingDepositAsPaidByReference(paymentReference: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE bookings
       SET deposit_paid = true,
           status = 'pending',
           paystack_reference = $2,
           updated_at = NOW()
       WHERE reference_code = $1`,
      [paymentReference, paymentReference],
    );
  }

  private async markBookingCompletionAsPaid(
    bookingReference: string,
    paymentReference: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE bookings
       SET final_payment_paid = true,
           status = 'completed',
           completed_at = NOW(),
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('reviewPromptPending', true, 'reviewPromptAt', NOW()),
           paystack_reference = $2,
           updated_at = NOW()
       WHERE reference_code = $1`,
      [bookingReference, paymentReference],
    );
  }

  private async markCorrectionAsPaid(
    bookingReference: string,
    paymentReference: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE booking_corrections
       SET is_paid = true,
           status = 'pending',
           payment_reference = $2,
           updated_at = NOW()
       WHERE booking_id = (SELECT id FROM bookings WHERE reference_code = $1)
         AND payment_reference = $2`,
      [bookingReference, paymentReference],
    );

    await this.dataSource.query(
      `UPDATE bookings
       SET status = 'revision_requested',
           updated_at = NOW()
       WHERE reference_code = $1`,
      [bookingReference],
    );
  }

  private async markOrderAsPaid(orderId: string, paymentReference: string): Promise<void> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update('orders')
      .set({
        status: 'paid',
        payment_status: 'completed',
        payment_reference: paymentReference,
        paid_at: () => 'NOW()',
      })
      .where('id = :orderId', { orderId })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Order not found');
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

    return transactions.map((t) => this.mapToResponseDto(t));
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
