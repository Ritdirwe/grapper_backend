import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from './domain/entities/transaction.entity';
import { Payout } from './domain/entities/payout.entity';
import { PayoutMethod } from '@contexts/identity/user-management/domain/entities/payout-method.entity';
import { PaymentService } from './application/services/payment.service';
import { PayoutService } from './application/services/payout.service';
import { PaystackService } from './infrastructure/gateways/paystack.service';
import { StripeService } from './infrastructure/gateways/stripe.service';
import { PaymentController } from './presentation/payment.controller';
import { PayoutController } from './presentation/payout.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Payout, PayoutMethod]), HttpModule],
  controllers: [PaymentController, PayoutController],
  providers: [PaymentService, PayoutService, PaystackService, StripeService],
  exports: [PaymentService, PayoutService, PaystackService, StripeService],
})
export class PaymentModule {}
