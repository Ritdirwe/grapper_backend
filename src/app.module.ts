import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { OpsModule } from './contexts/ops/ops.module';
import { IdentityContextModule } from './contexts/identity/identity-context.module';
import { MarketplaceModule } from './contexts/marketplace/marketplace.module';
import { BillingModule } from './contexts/billing/billing.module';
import { CommunityModule } from './contexts/community/community.module';
import { StorageModule } from './modules/storage/storage.module';
import { EmailModule } from './infrastructure/email/email.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import paymentConfig from './config/payment.config';
import mailConfig from './config/mail.config';
import firebaseConfig from './config/firebase.config';
import storageConfig from './config/storage.config';
import waitlistDatabaseConfig from './config/waitlist-database.config';
import { AuthorizationModule } from '@common/authz/authorization.module';
import { WaitlistModule } from './contexts/waitlist/waitlist.module';

function validateEnvironment(config: Record<string, any>) {
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONFIG_VALIDATION !== 'true') {
    return config;
  }

  const required = [
    'JWT_SECRET',
    'AUTH_SECRET',
    'DATABASE_HOST',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'PAYMENT_CALLBACK_URL',
  ];

  const gateway = String(process.env.DEFAULT_PAYMENT_GATEWAY || 'flutterwave').toLowerCase();
  if (gateway === 'flutterwave') {
    required.push('FLW_SECRET_KEY', 'FLW_CLIENT_ID', 'FLW_CLIENT_SECRET', 'FLW_WEBHOOK_SECRET', 'FLW_CALLBACK_URL');
  }

  if (gateway === 'paystack') {
    required.push('PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY');
  }

  if (gateway === 'stripe') {
    required.push('STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY');
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
  }

  return config;
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, waitlistDatabaseConfig, jwtConfig, paymentConfig, mailConfig, firebaseConfig, storageConfig],
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true,
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('app.env') === 'development',
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forRootAsync({
      name: 'waitlist',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('waitlistDatabase.host'),
        port: configService.get('waitlistDatabase.port'),
        username: configService.get('waitlistDatabase.username'),
        password: configService.get('waitlistDatabase.password'),
        database: configService.get('waitlistDatabase.database'),
        autoLoadEntities: true,
        synchronize: configService.get('waitlistDatabase.synchronize'),
        logging: configService.get('app.env') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Infrastructure
    AuthorizationModule,
    EmailModule,

    // Domain Modules
    IdentityContextModule,
    MarketplaceModule,
    BillingModule,
    CommunityModule,
    WaitlistModule,
    OpsModule,
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
