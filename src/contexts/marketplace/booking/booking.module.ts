import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from '@contexts/billing/payment/payment.module';
import { Booking } from './domain/entities/booking.entity';
import { BookingCorrection } from './domain/entities/booking-correction.entity';
import { BookingFile } from './domain/entities/booking-file.entity';
import { BookingMessage } from './domain/entities/booking-message.entity';
import { Order } from './domain/entities/order.entity';
import { Milestone } from './domain/entities/milestone.entity';
import { Dispute } from './domain/entities/dispute.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { BookingService } from './application/services/booking.service';
import { BookingFileService } from './application/services/booking-file.service';
import { BookingChatService } from './application/services/booking-chat.service';
import { OrderService } from './application/services/order.service';
import { BookingController } from './presentation/booking.controller';
import { OrderController } from './presentation/order.controller';
import { CheckoutController } from './presentation/checkout.controller';
import { BookingFileController } from './presentation/booking-file.controller';
import { BookingChatController } from './presentation/booking-chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingCorrection,
      BookingFile,
      BookingMessage,
      Order,
      Milestone,
      Dispute,
      Service,
      Profile,
    ]),
    PaymentModule,
  ],
  controllers: [
    BookingController,
    OrderController,
    CheckoutController,
    BookingFileController,
    BookingChatController,
  ],
  providers: [BookingService, BookingFileService, BookingChatService, OrderService],
  exports: [BookingService, BookingFileService, BookingChatService, OrderService],
})
export class BookingModule {}
