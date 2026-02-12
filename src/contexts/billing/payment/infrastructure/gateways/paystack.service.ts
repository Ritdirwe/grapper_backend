import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayInterface } from '../../domain/interfaces/payment-gateway.interface';
import axios from 'axios';

@Injectable()
export class PaystackService implements PaymentGatewayInterface {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('payment.paystack.secretKey');
  }

  async initializePayment(params: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    metadata?: Record<string, any>;
    callbackUrl?: string;
  }): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: params.amount * 100,
          email: params.email,
          reference: params.reference,
          currency: params.currency || 'NGN',
          metadata: params.metadata,
          callback_url: params.callbackUrl || this.configService.get('payment.callbackUrl'),
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to initialize payment');
      }

      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Payment initialization failed',
        );
      }
      throw error;
    }
  }

  async listBanks(country: string = 'nigeria') {
    try {
      const response = await axios.get(`${this.baseUrl}/bank?country=${country}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });
      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Failed to list banks',
        );
      }
      throw error;
    }
  }

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );
      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Failed to verify bank account',
        );
      }
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<{
    success: boolean;
    amount: number;
    currency: string;
    paidAt?: Date;
    gatewayReference: string;
    gatewayResponse: Record<string, any>;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = response.data.data;

      return {
        success: data.status === 'success',
        amount: data.amount / 100,
        currency: data.currency,
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
        gatewayReference: data.reference,
        gatewayResponse: data,
      };
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Payment verification failed',
        );
      }
      throw error;
    }
  }

  async refundPayment(
    reference: string,
    amount?: number,
  ): Promise<{
    success: boolean;
    refundReference: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: reference,
          amount: amount ? amount * 100 : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: response.data.status,
        refundReference: response.data.data.transaction.reference,
      };
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Refund failed',
        );
      }
      throw error;
    }
  }

  async createTransferRecipient(params: {
    type: 'nuban' | 'mobile_money' | 'basa';
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    recipientCode: string;
    recipientId: number;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: params.type,
          name: params.name,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: params.currency || 'NGN',
          metadata: params.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to create transfer recipient');
      }

      return {
        recipientCode: response.data.data.recipient_code,
        recipientId: response.data.data.id,
      };
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Failed to create transfer recipient',
        );
      }
      throw error;
    }
  }

  async initiateTransfer(params: {
    amount: number;
    recipientCode: string;
    reference: string;
    reason?: string;
    currency?: string;
  }): Promise<{
    success: boolean;
    transferCode: string;
    transferId: number;
    reference: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: params.amount * 100,
          recipient: params.recipientCode,
          reference: params.reference,
          reason: params.reason || 'Payout',
          currency: params.currency || 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to initiate transfer');
      }

      return {
        success: true,
        transferCode: response.data.data.transfer_code,
        transferId: response.data.data.id,
        reference: response.data.data.reference,
      };
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Transfer initiation failed',
        );
      }
      throw error;
    }
  }

  async verifyTransfer(reference: string): Promise<{
    success: boolean;
    status: string;
    amount: number;
    recipientCode: string;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transfer/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = response.data.data;

      return {
        success: data.status === 'success',
        status: data.status,
        amount: data.amount / 100,
        recipientCode: data.recipient.recipient_code,
      };
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data.message || 'Transfer verification failed',
        );
      }
      throw error;
    }
  }
}
