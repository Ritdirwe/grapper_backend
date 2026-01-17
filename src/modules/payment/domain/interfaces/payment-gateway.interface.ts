export interface PaymentGatewayInterface {
  initializePayment(params: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    metadata?: Record<string, any>;
    callbackUrl?: string;
  }): Promise<{
    authorizationUrl: string;
    accessCode?: string;
    reference: string;
  }>;

  verifyPayment(reference: string): Promise<{
    success: boolean;
    amount: number;
    currency: string;
    paidAt?: Date;
    gatewayReference: string;
    gatewayResponse: Record<string, any>;
  }>;

  refundPayment(reference: string, amount?: number): Promise<{
    success: boolean;
    refundReference: string;
  }>;
}
