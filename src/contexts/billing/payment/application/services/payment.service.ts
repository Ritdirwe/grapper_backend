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
import { FlutterwaveService } from '../../infrastructure/gateways/flutterwave.service';
import { StripeMobileGatewayService } from '../../infrastructure/gateways/stripe-mobile-gateway.service';
import { SavedPaymentMethodService } from './saved-payment-method.service';
import { NotificationOrchestratorService } from '@contexts/community/notification/application/services/notification-orchestrator.service';
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
    private flutterwaveService: FlutterwaveService,
    private stripeMobileGatewayService: StripeMobileGatewayService,
    private savedPaymentMethodService: SavedPaymentMethodService,
    private configService: ConfigService,
    private dataSource: DataSource,
    private notificationOrchestratorService: NotificationOrchestratorService,
  ) {}

  async initializePayment(
    userId: string,
    dto: InitializePaymentDto,
    options?: { reference?: string; callbackUrl?: string },
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

    const activeGateway = this.getActiveGateway();
    if (dto.gateway && dto.gateway !== activeGateway) {
      throw new BadRequestException(
        `Payment gateway ${dto.gateway} is not active. Active gateway is ${activeGateway}`,
      );
    }

    if (dto.savedPaymentMethodId && activeGateway !== PaymentGateway.FLUTTERWAVE) {
      throw new BadRequestException('Saved payment methods are only supported for Flutterwave');
    }

    const selectedSavedMethod =
      activeGateway === PaymentGateway.FLUTTERWAVE
        ? dto.savedPaymentMethodId
          ? await this.savedPaymentMethodService.getById(userId, dto.savedPaymentMethodId)
          : await this.savedPaymentMethodService.findPreferred(userId)
        : null;

    if (selectedSavedMethod && selectedSavedMethod.gateway !== PaymentGateway.FLUTTERWAVE) {
      throw new BadRequestException('Saved payment method is not supported for the active gateway');
    }

    if (dto.savedPaymentMethodId && !selectedSavedMethod) {
      throw new NotFoundException('Saved payment method not found');
    }

    const reference = options?.reference || this.generateReference();
    let transaction = await this.transactionRepository.findOne({ where: { reference } });
    if (!transaction) {
      transaction = this.transactionRepository.create({
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
          saveAuthorization: dto.saveAuthorization || false,
          savedPaymentMethodId: selectedSavedMethod?.id || dto.savedPaymentMethodId || null,
        },
      });
    } else {
      transaction.userId = userId;
      transaction.type = dto.type;
      transaction.amount = dto.amount;
      transaction.currency = dto.currency || 'NGN';
      transaction.gateway = dto.gateway || PaymentGateway.PAYSTACK;
      transaction.orderId = dto.orderId;
      transaction.bookingId = dto.bookingId;
      transaction.description = dto.description;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        email: dto.email,
        saveAuthorization: dto.saveAuthorization || false,
        savedPaymentMethodId: selectedSavedMethod?.id || dto.savedPaymentMethodId || null,
      };
    }

    transaction.gateway = activeGateway;

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
        saveAuthorization: dto.saveAuthorization || false,
        savedPaymentMethodId: selectedSavedMethod?.id || dto.savedPaymentMethodId || null,
      },
      callbackUrl: options?.callbackUrl || this.configService.get('payment.callbackUrl'),
      customer: dto.gatewayData?.customer,
      saveAuthorization: dto.saveAuthorization || false,
      paymentMethod:
        selectedSavedMethod && transaction.gateway === PaymentGateway.FLUTTERWAVE
          ? {
              type: 'tokenized',
              token: selectedSavedMethod.providerAuthorizationId,
              authorizationCode: selectedSavedMethod.authorizationCode,
            }
          : dto.gatewayData?.paymentMethod,
    });

    if (initResult.gatewayReference) {
      transaction.gatewayReference = initResult.gatewayReference;
      await this.transactionRepository.save(transaction);
    }

    transaction.markAsProcessing();
    await this.transactionRepository.save(transaction);

    return {
      reference: initResult.reference,
      authorizationUrl: initResult.authorizationUrl,
      clientSecret: initResult.clientSecret,
      accessCode: initResult.accessCode,
      processor: activeGateway,
      mode: initResult.clientSecret ? 'sdk' : 'redirect',
      publicKey: this.getGatewayPublicKey(activeGateway),
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
    const referenceForGateway =
      transaction.gatewayReference &&
      (transaction.gateway === PaymentGateway.STRIPE || transaction.gateway === PaymentGateway.FLUTTERWAVE)
        ? transaction.gatewayReference
        : dto.reference;

    const verifyResult = await gateway.verifyPayment(referenceForGateway);

    if (verifyResult.success) {
      transaction.markAsCompleted(
        verifyResult.gatewayReference,
        verifyResult.gatewayResponse,
      );
      await this.transactionRepository.save(transaction);

      await this.persistSavedPaymentMethodIfRequested(transaction, verifyResult.gatewayResponse);

      if (transaction.orderId) {
        await this.markOrderAsPaid(transaction.orderId, dto.reference);
        await this.notifyOrderPaid(transaction.orderId, transaction.userId, dto.reference);
      }
    } else {
      transaction.markAsFailed('Payment verification failed');
      await this.transactionRepository.save(transaction);

      await this.notificationOrchestratorService.notifyPayment(
        transaction.userId,
        'Payment verification failed',
        'We could not verify your payment. Please try again or contact support.',
        { reference: transaction.reference, transactionId: transaction.id },
      );
    }

    return this.mapToResponseDto(transaction);
  }

  async handleWebhook(
    payload: any,
    gateway: PaymentGateway,
    signature?: string,
    rawBody?: string | Buffer,
  ): Promise<void> {
    if (gateway === PaymentGateway.PAYSTACK) {
      this.paystackService.verifyWebhookSignature(rawBody || JSON.stringify(payload || {}), signature);

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
            await this.notifyOrderPaid(transaction.orderId, transaction.userId, data.reference);
          }

          if (transaction.bookingId) {
            await this.handleBookingPaymentByType(transaction.bookingId, transaction.type, data.reference);
          }
        }

        if (!transaction) {
          await this.handleBookingPaymentByReference(data.reference);
        }
      }
      return;
    }

    if (gateway === PaymentGateway.FLUTTERWAVE) {
      this.flutterwaveService.verifyWebhookSignature(rawBody || JSON.stringify(payload || {}), signature);

      if (!payload || typeof payload !== 'object') {
        return;
      }

      const eventType = String(payload.type || '').toLowerCase();
      const chargeData = payload.data || {};
      const txRef = chargeData.tx_ref || chargeData.reference;

      if (eventType !== 'charge.completed' || !txRef) {
        return;
      }

      const transaction = await this.transactionRepository.findOne({
        where: { reference: txRef },
      });

      if (!transaction || transaction.status === TransactionStatus.COMPLETED) {
        return;
      }

      try {
        const verifyResult = await this.flutterwaveService.verifyPayment(txRef);
        const expectedAmount = Number(transaction.amount);
        const expectedCurrency = transaction.currency;

        const amountMatches = Number(verifyResult.amount) === Number(expectedAmount);
        const currencyMatches =
          String(verifyResult.currency || '').toUpperCase() ===
          String(expectedCurrency || '').toUpperCase();

        if (verifyResult.success && amountMatches && currencyMatches) {
          transaction.markAsCompleted(
            verifyResult.gatewayReference,
            verifyResult.gatewayResponse,
          );
          await this.transactionRepository.save(transaction);

          await this.persistSavedPaymentMethodIfRequested(transaction, verifyResult.gatewayResponse);

          if (transaction.orderId) {
            await this.markOrderAsPaid(transaction.orderId, txRef);
            await this.notifyOrderPaid(transaction.orderId, transaction.userId, txRef);
          }

          if (transaction.bookingId) {
            await this.handleBookingPaymentByType(transaction.bookingId, transaction.type, txRef);
          }
          return;
        }

        transaction.markAsFailed('Flutterwave verification failed or mismatched amount/currency');
        await this.transactionRepository.save(transaction);

        await this.notificationOrchestratorService.notifyPayment(
          transaction.userId,
          'Payment verification failed',
          'We could not verify your payment. Please try again or contact support.',
          { reference: transaction.reference, transactionId: transaction.id },
        );
      } catch {
        transaction.markAsFailed('Flutterwave verification failed');
        await this.transactionRepository.save(transaction);

        await this.notificationOrchestratorService.notifyPayment(
          transaction.userId,
          'Payment verification failed',
          'We could not verify your payment. Please try again or contact support.',
          { reference: transaction.reference, transactionId: transaction.id },
        );
      }
    }
  }

  private async handleBookingPaymentByType(
    bookingId: string,
    type: TransactionType,
    reference: string,
  ): Promise<void> {
    if (type === TransactionType.BOOKING_PAYMENT) {
      if (reference.endsWith('-completion') || reference.includes('-correction-')) {
        await this.handleBookingPaymentByReference(reference);
        return;
      }

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
    const booking = await this.getBookingContextById(bookingId);
    await this.dataSource.query(
      `UPDATE bookings
       SET deposit_paid = true,
           final_payment_paid = true,
            status = 'confirmed',
            paystack_reference = $2,
            updated_at = NOW()
       WHERE id = $1`,
      [bookingId, paymentReference],
    );

    await this.notifyBookingDepositPaid(booking, paymentReference);
  }

  private async markBookingDepositAsPaidByReference(paymentReference: string): Promise<void> {
    const booking = await this.getBookingContextByReference(paymentReference);
    await this.dataSource.query(
      `UPDATE bookings
       SET deposit_paid = true,
           final_payment_paid = true,
            status = 'confirmed',
            paystack_reference = $2,
            updated_at = NOW()
       WHERE reference_code = $1`,
      [paymentReference, paymentReference],
    );

    await this.notifyBookingDepositPaid(booking, paymentReference);
  }

  private async markBookingCompletionAsPaid(
    bookingReference: string,
    paymentReference: string,
  ): Promise<void> {
    const booking = await this.getBookingContextByReference(bookingReference);
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

    if (booking) {
      await this.notificationOrchestratorService.notifyPayment(
        booking.customerId,
        'Final payment completed',
        `Final payment for ${booking.serviceTitle || 'your booking'} has been completed.`,
        { bookingId: booking.id, reference: paymentReference },
      );

      await this.notificationOrchestratorService.notifyPayment(
        booking.providerId,
        'Final payment received',
        `Final payment for ${booking.serviceTitle || 'a booking'} has been received.`,
        { bookingId: booking.id, reference: paymentReference },
      );
    }
  }

  private async markCorrectionAsPaid(
    bookingReference: string,
    paymentReference: string,
  ): Promise<void> {
    const booking = await this.getBookingContextByReference(bookingReference);
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

    if (booking) {
      await this.notificationOrchestratorService.notifyPayment(
        booking.providerId,
        'Correction payment received',
        `A correction payment for ${booking.serviceTitle || 'a booking'} was received.`,
        { bookingId: booking.id, reference: paymentReference },
      );
    }
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

  private async notifyOrderPaid(orderId: string, payerId: string, reference: string): Promise<void> {
    const order = await this.getOrderContext(orderId);
    if (!order) {
      return;
    }

    if (order.customerId === payerId) {
      await this.notificationOrchestratorService.notifyPayment(
        order.customerId,
        'Payment successful',
        `Your payment for ${order.serviceTitle || 'your order'} was successful.`,
        { orderId: order.id, reference },
      );
    }

    await this.notificationOrchestratorService.notifyPayment(
      order.providerId,
      'New order payment received',
      `A payment for ${order.serviceTitle || 'an order'} was received.`,
      { orderId: order.id, reference },
    );
  }

  private async notifyBookingDepositPaid(
    booking: { id: string; customerId: string; providerId: string; serviceTitle?: string } | null,
    reference: string,
  ): Promise<void> {
    if (!booking) {
      return;
    }

    await this.notificationOrchestratorService.notifyPayment(
      booking.customerId,
      'Booking payment successful',
      `Your payment for ${booking.serviceTitle || 'your booking'} was successful.`,
      { bookingId: booking.id, reference },
    );

    await this.notificationOrchestratorService.notifyBookingConfirmed(
      booking.providerId,
      'Booking paid',
      `${booking.serviceTitle || 'A booking'} has been paid and is ready for fulfillment.`,
      { bookingId: booking.id, reference },
    );
  }

  private async persistSavedPaymentMethodIfRequested(
    transaction: Transaction,
    gatewayResponse: Record<string, any>,
  ): Promise<void> {
    const shouldSave = Boolean(transaction.metadata?.saveAuthorization);

    if (!shouldSave || transaction.gateway !== PaymentGateway.FLUTTERWAVE) {
      return;
    }

    const savedMethod = this.extractFlutterwaveSavedPaymentMethod(gatewayResponse);
    if (!savedMethod) {
      return;
    }

    const saved = await this.savedPaymentMethodService.saveFromGateway(transaction.userId, {
      gateway: PaymentGateway.FLUTTERWAVE,
      providerAuthorizationId: savedMethod.providerAuthorizationId,
      authorizationCode: savedMethod.authorizationCode,
      cardBrand: savedMethod.cardBrand,
      last4: savedMethod.last4,
      expiryMonth: savedMethod.expiryMonth,
      expiryYear: savedMethod.expiryYear,
      metadata: {
        ...savedMethod.metadata,
        transactionReference: transaction.reference,
        transactionId: transaction.id,
      },
      isDefault: !transaction.metadata?.savedPaymentMethodId,
    });

    transaction.metadata = {
      ...(transaction.metadata || {}),
      savedPaymentMethodId: saved.id,
    };
    await this.transactionRepository.save(transaction);
  }

  private extractFlutterwaveSavedPaymentMethod(gatewayResponse: Record<string, any>): {
    providerAuthorizationId: string;
    authorizationCode?: string;
    cardBrand?: string;
    last4?: string;
    expiryMonth?: string;
    expiryYear?: string;
    metadata?: Record<string, any>;
  } | null {
    const response = gatewayResponse || {};
    const card = response.card || response.payment_card || response.data?.card;
    const authorization = response.authorization || response.data?.authorization;
    const providerAuthorizationId = String(
      card?.token || authorization?.token || authorization?.authorization_code || '',
    ).trim();

    if (!providerAuthorizationId) {
      return null;
    }

    return {
      providerAuthorizationId,
      authorizationCode: authorization?.authorization_code || authorization?.token,
      cardBrand: card?.type || card?.brand,
      last4: card?.last_4 || card?.last4,
      expiryMonth: card?.exp_month || card?.expiry_month,
      expiryYear: card?.exp_year || card?.expiry_year,
      metadata: {
        gatewayReference: response.id || response.reference || response.tx_ref,
        status: response.status,
        chargedAmount: response.amount,
        currency: response.currency,
      },
    };
  }

  private async getOrderContext(orderId: string): Promise<{ id: string; customerId: string; providerId: string; serviceTitle?: string } | null> {
    const [order] = await this.dataSource.query(
      `SELECT o.id, o.customer_id AS "customerId", o.provider_id AS "providerId", s.title AS "serviceTitle"
       FROM orders o
       LEFT JOIN services s ON s.id = o.service_id
       WHERE o.id = $1
       LIMIT 1`,
      [orderId],
    );

    return order || null;
  }

  private async getBookingContextById(bookingId: string): Promise<{ id: string; customerId: string; providerId: string; serviceTitle?: string } | null> {
    const [booking] = await this.dataSource.query(
      `SELECT b.id, b.customer_id AS "customerId", b.provider_id AS "providerId", s.title AS "serviceTitle"
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId],
    );

    return booking || null;
  }

  private async getBookingContextByReference(reference: string): Promise<{ id: string; customerId: string; providerId: string; serviceTitle?: string } | null> {
    const [booking] = await this.dataSource.query(
      `SELECT b.id, b.customer_id AS "customerId", b.provider_id AS "providerId", s.title AS "serviceTitle"
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       WHERE b.reference_code = $1
       LIMIT 1`,
      [reference],
    );

    return booking || null;
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
      case PaymentGateway.FLUTTERWAVE:
        return this.flutterwaveService;
      case PaymentGateway.STRIPE:
        return this.stripeMobileGatewayService;
      default:
        throw new BadRequestException('Unsupported payment gateway');
    }
  }

  private getActiveGateway(): PaymentGateway {
    const configured = String(
      this.configService.get('payment.defaultGateway') || 'flutterwave',
    ).toLowerCase();

    switch (configured) {
      case PaymentGateway.FLUTTERWAVE:
        return PaymentGateway.FLUTTERWAVE;
      case PaymentGateway.PAYSTACK:
        return PaymentGateway.PAYSTACK;
      case PaymentGateway.STRIPE:
        return PaymentGateway.STRIPE;
      default:
        return PaymentGateway.FLUTTERWAVE;
    }
  }

  private getGatewayPublicKey(gateway: PaymentGateway): string | undefined {
    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        return this.configService.get<string>('payment.paystack.publicKey');
      case PaymentGateway.FLUTTERWAVE:
        return this.configService.get<string>('payment.flutterwave.publicKey');
      case PaymentGateway.STRIPE:
        return this.configService.get<string>('payment.stripe.publishableKey');
      default:
        return undefined;
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
