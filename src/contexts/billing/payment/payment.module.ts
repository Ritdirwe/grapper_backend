import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from './domain/entities/transaction.entity';
import { Payout } from './domain/entities/payout.entity';
import { PayoutMethod } from '@contexts/identity/user-management/domain/entities/payout-method.entity';
import { PaymentService } from './application/services/payment.service';
import { PayoutService } from './application/services/payout.service';
import { PayoutReleaseService } from './application/services/payout-release.service';
import { PaystackService } from './infrastructure/gateways/paystack.service';
import { StripeService } from './infrastructure/gateways/stripe.service';
import { FlutterwaveService } from './infrastructure/gateways/flutterwave.service';
import { StripeMobileGatewayService } from './infrastructure/gateways/stripe-mobile-gateway.service';
import { PaymentController } from './presentation/payment.controller';
import { PayoutController } from './presentation/payout.controller';
import { PayoutRelease } from './domain/entities/payout-release.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Payout, PayoutMethod, PayoutRelease]), HttpModule],
  controllers: [PaymentController, PayoutController],
  providers: [
    PaymentService,
    PayoutService,
    PayoutReleaseService,
    PaystackService,
    StripeService,
    StripeMobileGatewayService,
    FlutterwaveService,
  ],
  exports: [
    PaymentService,
    PayoutService,
    PayoutReleaseService,
    PaystackService,
    StripeService,
    StripeMobileGatewayService,
    FlutterwaveService,
  ],
})
export class PaymentModule {}
