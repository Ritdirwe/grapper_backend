import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

type MailProvider = 'smtp' | 'resend' | 'mailtrap';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private resendClient: Resend;
  private readonly provider: MailProvider;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<MailProvider>('mail.provider') || 'smtp';
    this.initializeProvider();
  }

  private initializeProvider() {
    if (this.provider === 'resend') {
      this.initializeResendClient();
      return;
    }

    if (this.provider === 'mailtrap') {
      this.initializeMailtrapProvider();
      return;
    }

    this.createSmtpTransporter();
  }

  private initializeResendClient() {
    const resendApiKey = this.configService.get<string>('mail.resend.apiKey');
    if (!resendApiKey) {
      this.logger.warn(
        'MAIL_PROVIDER is set to resend but RESEND_API_KEY is missing. Emails will be logged to console.',
      );
      return;
    }

    this.resendClient = new Resend(resendApiKey);
  }

  private initializeMailtrapProvider() {
    const token = this.configService.get<string>('mail.mailtrap.token');
    if (!token) {
      this.logger.warn(
        'MAIL_PROVIDER is set to mailtrap but MAILTRAP_API_TOKEN is missing. Emails will be logged to console.',
      );
    }
  }

  private createSmtpTransporter() {
    const mailConfig = {
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure'),
      auth: {
        user: this.configService.get<string>('mail.auth.user'),
        pass: this.configService.get<string>('mail.auth.pass'),
      },
    };

    // If no mail credentials, use console logging for development
    if (!mailConfig.auth.user || !mailConfig.auth.pass) {
      this.logger.warn(
        'Email credentials not configured. Emails will be logged to console.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport(mailConfig);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!options.html && !options.text) {
      this.logger.error('Email content is missing. Provide html and/or text body.');
      return false;
    }

    const from = {
      name: this.configService.get<string>('mail.from.name'),
      address: this.configService.get<string>('mail.from.address'),
    };

    try {
      switch (this.provider) {
        case 'resend':
          await this.sendWithResend(options, from);
          break;
        case 'mailtrap':
          await this.sendWithMailtrap(options, from);
          break;
        case 'smtp':
        default:
          await this.sendWithSmtp(options, from);
          break;
      }

      this.logger.log(`Email sent successfully to ${options.to} using ${this.provider}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  private async sendWithSmtp(
    options: EmailOptions,
    from: { name: string; address: string },
  ): Promise<void> {
    if (!this.transporter) {
      this.logEmailInDevelopmentMode(options, from, 'smtp');
      return;
    }

    const mailOptions = {
      from: `"${from.name}" <${from.address}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await this.transporter.sendMail(mailOptions);
  }

  private async sendWithResend(
    options: EmailOptions,
    from: { name: string; address: string },
  ): Promise<void> {
    if (!this.resendClient) {
      this.logEmailInDevelopmentMode(options, from, 'resend');
      return;
    }

    await this.resendClient.emails.send({
      from: `"${from.name}" <${from.address}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  private async sendWithMailtrap(
    options: EmailOptions,
    from: { name: string; address: string },
  ): Promise<void> {
    const token = this.configService.get<string>('mail.mailtrap.token');
    const apiUrl = this.configService.get<string>('mail.mailtrap.apiUrl');

    if (!token || !apiUrl) {
      this.logEmailInDevelopmentMode(options, from, 'mailtrap');
      return;
    }

    await axios.post(
      apiUrl,
      {
        from: { email: from.address, name: from.name },
        to: [{ email: options.to }],
        subject: options.subject,
        text: options.text,
        html: options.html,
        category: 'Transactional',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private logEmailInDevelopmentMode(
    options: EmailOptions,
    from: { name: string; address: string },
    provider: MailProvider,
  ) {
    this.logger.log('='.repeat(60));
    this.logger.log(`EMAIL (${provider.toUpperCase()} Development Mode)`);
    this.logger.log(`To: ${options.to}`);
    this.logger.log(`Subject: ${options.subject}`);
    this.logger.log(`From: ${from.name} <${from.address}>`);
    if (options.text) {
      this.logger.log(`Text: ${options.text}`);
    }
    this.logger.log('='.repeat(60));
  }

  async sendVerificationCode(email: string, code: string, userName?: string): Promise<boolean> {
    const subject = 'Verify Your Email - Gripper Marketplace';
    const html = this.getVerificationEmailTemplate(code, userName);
    const text = `Your verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this code, please ignore this email.`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendPasswordResetCode(email: string, code: string, userName?: string): Promise<boolean> {
    const subject = 'Reset Your Password - Gripper Marketplace';
    const html = this.getPasswordResetTemplate(code, userName);
    const text = `Your password reset code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this code, please ignore this email.`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to Gripper Marketplace!';
    const html = this.getWelcomeEmailTemplate(userName);
    const text = `Welcome to Gripper Marketplace, ${userName}!\n\nWe're excited to have you on board.`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  private getVerificationEmailTemplate(code: string, userName?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Gripper Marketplace</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
              ${userName ? `<p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">Hi ${userName},</p>` : ''}
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                Thank you for signing up! Please use the verification code below to verify your email address:
              </p>
              
              <!-- OTP Code -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.5;">
                This code will expire in <strong>15 minutes</strong>.
              </p>
              
              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Gripper Marketplace. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getPasswordResetTemplate(code: string, userName?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Reset</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
              ${userName ? `<p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">Hi ${userName},</p>` : ''}
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password. Use the code below to proceed:
              </p>
              
              <!-- OTP Code -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px; background-color: #fff5f5; border: 2px dashed #f5576c; border-radius: 8px;">
                    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f5576c; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.5;">
                This code will expire in <strong>15 minutes</strong>.
              </p>
              
              <p style="margin: 0; color: #dc3545; font-size: 14px; line-height: 1.5; font-weight: 600;">
                If you didn't request this, please ignore this email and ensure your account is secure.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Gripper Marketplace. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getWelcomeEmailTemplate(userName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Gripper!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">🎉 Welcome!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Hi ${userName}!</h2>
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                Welcome to <strong>Gripper Marketplace</strong>! We're thrilled to have you join our community.
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                You can now explore services, connect with providers, and start booking amazing experiences.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${this.configService.get('app.frontendUrl')}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Get Started
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Gripper Marketplace. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
