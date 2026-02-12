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
import storageConfig from './config/storage.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, paymentConfig, mailConfig, storageConfig],
      envFilePath: ['.env.local', '.env'],
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

    // Infrastructure
    EmailModule,

    // Domain Modules
    IdentityContextModule,
    MarketplaceModule,
    BillingModule,
    CommunityModule,
    OpsModule,
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
