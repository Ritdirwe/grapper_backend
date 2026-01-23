import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { SocialModule } from './modules/social/social.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { AdvertisementModule } from './modules/advertisement/advertisement.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { GigsModule } from './modules/gigs/gigs.module';
import { EmailModule } from './infrastructure/email/email.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import paymentConfig from './config/payment.config';
import mailConfig from './config/mail.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, paymentConfig, mailConfig],
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
    IdentityModule,
    UserManagementModule,
    ServiceCatalogModule,
    BookingModule,
    PaymentModule,
    SocialModule,
    MessagingModule,
    SubscriptionModule,
    AdvertisementModule,
    AdminModule,
    ReportingModule,
    StorageModule,
    NotificationModule,
    ContractsModule,
    ReviewsModule,
    GigsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
