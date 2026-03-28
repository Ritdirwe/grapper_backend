import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('payment.stripe.secretKey');
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  async createCheckoutSession(options: {
    customerId?: string;
    customerEmail?: string;
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    applicationFeeAmount?: number;
    transferData?: Stripe.Checkout.SessionCreateParams.PaymentIntentData.TransferData;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: options.customerId,
        customer_email: options.customerEmail,
        line_items: options.lineItems,
        mode: 'payment',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: options.metadata,
        payment_intent_data: {
          application_fee_amount: options.applicationFeeAmount,
          transfer_data: options.transferData,
        },
      });

      return session;
    } catch (error) {
      this.logger.error(`Stripe Checkout Session Error: ${error.message}`);
      throw error;
    }
  }

  async createPaymentIntent(options: {
    amount: number;
    currency: string;
    receiptEmail?: string;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount: Math.round(options.amount),
        currency: options.currency,
        receipt_email: options.receiptEmail,
        metadata: options.metadata,
        description: options.description,
        automatic_payment_methods: { enabled: true },
      });
    } catch (error) {
      this.logger.error(`Stripe PaymentIntent Error: ${error.message}`);
      throw error;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createConnectAccount(userId: string, email: string) {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        metadata: { userId },
      });

      return account;
    } catch (error) {
      this.logger.error(`Stripe Connect Account Error: ${error.message}`);
      throw error;
    }
  }

  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      this.logger.error(`Stripe Account Link Error: ${error.message}`);
      throw error;
    }
  }

  async createTransfer(amount: number, currency: string, destination: string, description?: string) {
    try {
      const transfer = await this.stripe.transfers.create({
        amount,
        currency,
        destination,
        description,
      });

      return transfer;
    } catch (error) {
      this.logger.error(`Stripe Transfer Error: ${error.message}`);
      throw error;
    }
  }

  async getAccount(accountId: string) {
    return this.stripe.accounts.retrieve(accountId);
  }
}
