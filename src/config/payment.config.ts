import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  defaultGateway: process.env.DEFAULT_PAYMENT_GATEWAY || 'flutterwave',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  },
  flutterwave: {
    publicKey: process.env.FLW_PUBLIC_KEY,
    secretKey: process.env.FLW_SECRET_KEY,
    clientId: process.env.FLW_CLIENT_ID,
    clientSecret: process.env.FLW_CLIENT_SECRET,
    authUrl:
      process.env.FLW_AUTH_URL ||
      'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
    baseUrl:
      process.env.FLW_BASE_URL || 'https://developersandbox-api.flutterwave.com',
    webhookSecret: process.env.FLW_WEBHOOK_SECRET,
    callbackUrl: process.env.FLW_CALLBACK_URL || process.env.PAYMENT_CALLBACK_URL,
  },
  callbackUrl: process.env.PAYMENT_CALLBACK_URL,
}));
