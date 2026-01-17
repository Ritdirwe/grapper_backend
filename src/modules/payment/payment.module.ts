import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { Transaction } from './domain/entities/transaction.entity';
import { Payout } from './domain/entities/payout.entity';
import { Order } from '../booking/domain/entities/order.entity';
import { PayoutMethod } from '../user-management/domain/entities/payout-method.entity';

// Services
import { PaymentService } from './application/services/payment.service';
import { PayoutService } from './application/services/payout.service';
import { PaystackService } from './infrastructure/gateways/paystack.service';
import { OrderService } from '../booking/application/services/order.service';

// Controllers
import { PaymentController } from './presentation/payment.controller';
import { PayoutController } from './presentation/payout.controller';

// Import dependencies from booking module
import { BookingModule } from '../booking/booking.module';

import { StripeService } from './infrastructure/gateways/stripe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Payout, Order, PayoutMethod]),
    HttpModule,
    forwardRef(() => BookingModule),
  ],
  controllers: [PaymentController, PayoutController],
  providers: [PaymentService, PayoutService, PaystackService, StripeService],
  exports: [PaymentService, PayoutService, PaystackService, StripeService],
})
export class PaymentModule {}
