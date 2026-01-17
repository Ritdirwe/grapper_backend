import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Booking } from './domain/entities/booking.entity';
import { Order } from './domain/entities/order.entity';
import { Milestone } from './domain/entities/milestone.entity';
import { Dispute } from './domain/entities/dispute.entity';
import { Service } from '../service-catalog/domain/entities/service.entity';
import { Profile } from '../user-management/domain/entities/profile.entity';

// Services
import { BookingService } from './application/services/booking.service';
import { OrderService } from './application/services/order.service';

// Controllers
import { BookingController } from './presentation/booking.controller';
import { OrderController } from './presentation/order.controller';
import { CheckoutController } from './presentation/checkout.controller';

// Internal Dependencies
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Order,
      Milestone,
      Dispute,
      Service,
      Profile,
    ]),
    forwardRef(() => PaymentModule),
  ],
  controllers: [BookingController, OrderController, CheckoutController],
  providers: [BookingService, OrderService],
  exports: [BookingService, OrderService],
})
export class BookingModule {}
