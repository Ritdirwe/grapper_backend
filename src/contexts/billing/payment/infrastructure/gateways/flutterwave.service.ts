import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentGatewayInterface } from '../../domain/interfaces/payment-gateway.interface';

type FlutterwaveCharge = {
  id?: string;
  tx_ref?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paid_at?: string;
  processor_response?: unknown;
};

type FlutterwaveTransfer = {
  id?: string;
  reference?: string;
  status?: string;
};

@Injectable()
export class FlutterwaveService implements PaymentGatewayInterface {
  private accessToken?: string;

  private tokenExpiresAt = 0;

  private readonly secretKey?: string;

  private readonly clientId?: string;

  private readonly clientSecret?: string;

  private readonly authUrl: string;

  private readonly baseUrl: string;

  private readonly callbackUrl?: string;

  private readonly webhookSecret?: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('payment.flutterwave.clientId');
    this.clientSecret = this.configService.get<string>('payment.flutterwave.clientSecret');
    this.secretKey = this.configService.get<string>('payment.flutterwave.secretKey');
    this.authUrl = this.configService.get<string>(
      'payment.flutterwave.authUrl',
      'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
    );
    this.baseUrl = this.configService.get<string>(
      'payment.flutterwave.baseUrl',
      'https://api.flutterwave.com',
    );
    this.callbackUrl = this.configService.get<string>('payment.flutterwave.callbackUrl');
    this.webhookSecret = this.configService.get<string>('payment.flutterwave.webhookSecret');
  }

  async initializePayment(params: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    metadata?: Record<string, any>;
    callbackUrl?: string;
    customer?: Record<string, any>;
    paymentMethod?: Record<string, any>;
  }): Promise<{
    authorizationUrl?: string;
    clientSecret?: string;
    accessCode?: string;
    gatewayReference?: string;
    reference: string;
  }> {
    const authHeader = await this.getAuthorizationHeaderValue();

    const redirectUrl = params.callbackUrl || this.callbackUrl;
    if (!redirectUrl) {
      throw new BadRequestException('Flutterwave callbackUrl is not configured');
    }

    const payload = {
      amount: params.amount,
      currency: params.currency || 'NGN',
      redirect_url: redirectUrl,
      reference: params.reference,
      customer: {
        email: params.email,
        ...(params.customer || {}),
      },
      payment_method: params.paymentMethod || { type: 'opay' },
      meta: params.metadata,
      title: 'Grapper',
      description: params.metadata?.description || `Payment ${params.reference}`,
      x_trace_id: params.reference,
      x_idempotency_key: `${params.reference}-${Date.now()}`,
    };

    const base = this.baseUrl.replace(/\/+$/, '');
    const url = `${base}/orchestration/direct-charges`;

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'X-Trace-Id': params.reference,
          'X-Idempotency-Key': `${params.reference}-${Date.now()}`,
        },
      });

      const data = response.data?.data || {};
      const authorizationUrl =
        data?.next_action?.redirect_url?.url ||
        data?.redirect_url ||
        data?.link ||
        data?.authorization_url;

      if (!authorizationUrl) {
        throw new BadRequestException('Flutterwave did not return a redirect URL');
      }

      return {
        authorizationUrl,
        gatewayReference: String(data.id || data.reference || params.reference),
        reference: String(data.reference || params.reference),
      };
    } catch (error) {
      this.handleGatewayError(error, 'Flutterwave payment initialization failed');
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
    const authHeader = await this.getAuthorizationHeaderValue();
    const charge = await this.getChargeByReference(reference, authHeader);

    if (!charge) {
      throw new NotFoundException('Flutterwave charge not found for reference');
    }

    const status = String(charge.status || '').toLowerCase().toLowerCase();
    const amount = Number(charge.amount || 0);
    const normalizedAmount = Number.isFinite(amount) ? amount : 0;

    return {
      success: status === 'successful' || status === 'succeeded' || status === 'success',
      amount: normalizedAmount,
      currency: charge.currency || 'NGN',
      paidAt: charge.paid_at ? new Date(charge.paid_at) : undefined,
      gatewayReference: String(charge.id || charge.reference || charge.tx_ref || reference),
      gatewayResponse: charge as Record<string, any>,
    };
  }

  async refundPayment(): Promise<{ success: boolean; refundReference: string }> {
    throw new BadRequestException('Flutterwave refunds are not configured in this integration');
  }

  async listBanks(country: string = 'NG') {
    const authHeader = await this.getAuthorizationHeaderValue();

    try {
      const base = this.baseUrl.replace(/\/+$/, '');
      const url = base.endsWith('/v3')
        ? `${base}/banks/${encodeURIComponent(country)}`
        : `${base}/v3/banks/${encodeURIComponent(country)}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader,
        },
      });
      return response.data?.data || [];
    } catch (error) {
      this.handleGatewayError(error, 'Flutterwave bank list request failed');
    }
  }

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    const authHeader = await this.getAuthorizationHeaderValue();

    const base = this.baseUrl.replace(/\/+$/, '');
    const resolveEndpoint = base.endsWith('/v3')
      ? `${base}/accounts/resolve`
      : `${base}/v3/accounts/resolve`;

    const endpoints = [
      {
        method: 'POST' as const,
        url: resolveEndpoint,
        body: { account_number: accountNumber, account_bank: bankCode },
      },
      {
        method: 'GET' as const,
        url: `${resolveEndpoint}?account_number=${encodeURIComponent(accountNumber)}&account_bank=${encodeURIComponent(bankCode)}`,
      },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.request({
          method: endpoint.method,
          url: endpoint.url,
          data: endpoint.body,
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });

        return response.data?.data || response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status && axiosError.response.status < 500) {
          continue;
        }
      }
    }

    throw new BadRequestException('Flutterwave account verification failed');
  }

  async initiateTransfer(params: {
    amount: number;
    accountNumber?: string;
    bankCode?: string;
    accountName?: string;
    reference: string;
    reason?: string;
    currency?: string;
  }): Promise<{ success: boolean; transferCode: string; transferId?: string | number; recipientCode?: string }> {
    const authHeader = await this.getAuthorizationHeaderValue();

    if (!params.accountNumber || !params.bankCode) {
      throw new BadRequestException('accountNumber and bankCode are required for Flutterwave transfer');
    }

    const payload = {
      amount: params.amount,
      currency: params.currency || 'NGN',
      reference: params.reference,
      narration: params.reason || 'Payout transfer',
      beneficiary: {
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        account_name: params.accountName,
      },
    };

    try {
      const base = this.baseUrl.replace(/\/+$/, '');
      const url = base.endsWith('/v3') ? `${base}/transfers` : `${base}/v3/transfers`;

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data?.data || {};
      return {
        success: true,
        transferCode: String(data.reference || params.reference),
        transferId: data.id,
        recipientCode: data.beneficiary_id || data.account_id,
      };
    } catch (error) {
      this.handleGatewayError(error, 'Flutterwave transfer initiation failed');
    }
  }

  async verifyTransfer(reference: string): Promise<{
    success: boolean;
    status: string;
    gatewayResponse: Record<string, any>;
  }> {
    const authHeader = await this.getAuthorizationHeaderValue();
    const transfer = await this.getTransferByReference(reference, authHeader);

    if (!transfer) {
      throw new NotFoundException('Flutterwave transfer not found for reference');
    }

    const status = String(transfer.status || '').toLowerCase();

    return {
      success: ['successful', 'success', 'completed'].includes(status),
      status,
      gatewayResponse: transfer as Record<string, any>,
    };
  }

  verifyWebhookSignature(payload: any, signature?: string): void {
    if (!this.webhookSecret) {
      throw new UnauthorizedException('Flutterwave webhook secret is not configured');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing Flutterwave webhook signature');
    }

    const rawBody = JSON.stringify(payload || {});
    const computed = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('base64');

    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computed);

    const isMatch =
      signatureBuffer.length === computedBuffer.length &&
      timingSafeEqual(signatureBuffer, computedBuffer);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid Flutterwave webhook signature');
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new InternalServerErrorException('Flutterwave API credentials are not configured');
    }

    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      });

      const response = await axios.post(this.authUrl, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data?.access_token;
      const expiresIn = Number(response.data?.expires_in || 600);
      this.tokenExpiresAt = now + expiresIn * 1000;

      if (!this.accessToken) {
        throw new InternalServerErrorException('Flutterwave auth token response missing access_token');
      }

      return this.accessToken;
    } catch (error) {
      this.handleGatewayError(error, 'Flutterwave authentication failed');
    }
  }

  private async getAuthorizationHeaderValue(): Promise<string> {
    if (this.secretKey) {
      return `Bearer ${this.secretKey}`;
    }
    const token = await this.getAccessToken();
    return `Bearer ${token}`;
  }

  private async getChargeByReference(
    reference: string,
    authHeader: string,
  ): Promise<FlutterwaveCharge | null> {
    const base = this.baseUrl.replace(/\/+$/, '');
    const endpoints = [
      `${base}/charges/${encodeURIComponent(reference)}`,
      `${base}/charges?reference=${encodeURIComponent(reference)}`,
    ];

    for (const url of endpoints) {
      try {
        const response = await axios.request({
          method: 'GET',
          url,
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });

        const data = response.data?.data;
        if (Array.isArray(data) && data.length > 0) {
          return data[0] as FlutterwaveCharge;
        }

        if (data && typeof data === 'object') {
          return data as FlutterwaveCharge;
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status && axiosError.response.status < 500) {
          continue;
        }
      }
    }

    return null;
  }

  private async getTransferByReference(
    reference: string,
    authHeader: string,
  ): Promise<FlutterwaveTransfer | null> {
    const base = this.baseUrl.replace(/\/+$/, '');
    const transfersBase = base.endsWith('/v3') ? `${base}/transfers` : `${base}/v3/transfers`;
    const endpoints = [
      `${transfersBase}?reference=${encodeURIComponent(reference)}`,
      `${transfersBase}/${encodeURIComponent(reference)}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });

        const data = response.data?.data;
        if (Array.isArray(data) && data.length > 0) {
          return data[0] as FlutterwaveTransfer;
        }

        if (data && typeof data === 'object') {
          return data as FlutterwaveTransfer;
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status && axiosError.response.status < 500) {
          continue;
        }
      }
    }

    return null;
  }

  private handleGatewayError(error: unknown, fallbackMessage: string): never {
    if (axios.isAxiosError(error)) {
      const apiMessage =
        (error.response?.data as Record<string, any> | undefined)?.message ||
        (error.response?.data as Record<string, any> | undefined)?.error ||
        fallbackMessage;

      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new UnauthorizedException(apiMessage);
      }

      throw new BadRequestException(apiMessage);
    }

    if (error instanceof Error) {
      throw new BadRequestException(error.message || fallbackMessage);
    }

    throw new BadRequestException(fallbackMessage);
  }
}
