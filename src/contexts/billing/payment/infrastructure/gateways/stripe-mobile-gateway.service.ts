import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentGatewayInterface } from '../../domain/interfaces/payment-gateway.interface';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeMobileGatewayService implements PaymentGatewayInterface {
  constructor(private readonly stripeService: StripeService) {}

  async initializePayment(params: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    metadata?: Record<string, any>;
    callbackUrl?: string;
    customer?: Record<string, any>;
    paymentMethod?: Record<string, any>;
    saveAuthorization?: boolean;
  }): Promise<{
    authorizationUrl?: string;
    clientSecret?: string;
    accessCode?: string;
    gatewayReference?: string;
    reference: string;
  }> {
    const currency = (params.currency || 'NGN').toLowerCase();

    const intent = await this.stripeService.createPaymentIntent({
      amount: Math.round(Number(params.amount) * 100),
      currency,
      receiptEmail: params.email,
      description: `Payment ${params.reference}`,
      metadata: {
        reference: params.reference,
        ...(params.metadata || {}),
      },
    });

    if (!intent.client_secret) {
      throw new BadRequestException('Stripe did not return a client_secret');
    }

    return {
      reference: params.reference,
      clientSecret: intent.client_secret,
      gatewayReference: intent.id,
    };
  }

  async verifyPayment(paymentIntentId: string): Promise<{
    success: boolean;
    amount: number;
    currency: string;
    paidAt?: Date;
    gatewayReference: string;
    gatewayResponse: Record<string, any>;
  }> {
    const intent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
    const success = intent.status === 'succeeded';

    return {
      success,
      amount: (intent.amount_received || intent.amount || 0) / 100,
      currency: String(intent.currency || '').toUpperCase(),
      paidAt: intent.created ? new Date(intent.created * 1000) : undefined,
      gatewayReference: intent.id,
      gatewayResponse: intent as unknown as Record<string, any>,
    };
  }

  async refundPayment(): Promise<{ success: boolean; refundReference: string }> {
    throw new BadRequestException('Stripe refunds are not configured in this integration');
  }
}
