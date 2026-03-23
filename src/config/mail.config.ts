import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  provider: process.env.MAIL_PROVIDER || 'smtp',
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
  from: {
    name: process.env.MAIL_FROM_NAME || 'Grapper Marketplace',
    address: process.env.MAIL_FROM_ADDRESS || 'noreply@grapper.com',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || process.env.RESEND_MAIL_API,
  },
  mailtrap: {
    apiUrl: process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io/api/send',
    token: process.env.MAILTRAP_API_TOKEN,
  },
}));
