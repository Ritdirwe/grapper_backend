import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from '@contexts/billing/payment/payment.module';
import { NotificationModule } from '@contexts/community/notification/notification.module';
import { AdminModule } from '@contexts/ops/admin/admin.module';
import { Booking } from './domain/entities/booking.entity';
import { BookingCorrection } from './domain/entities/booking-correction.entity';
import { BookingFile } from './domain/entities/booking-file.entity';
import { BookingMessage } from './domain/entities/booking-message.entity';
import { BookingMilestone } from './domain/entities/booking-milestone.entity';
import { BookingMilestoneEvidence } from './domain/entities/booking-milestone-evidence.entity';
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
import { BookingMilestoneController } from './presentation/booking-milestone.controller';
import { BookingMilestoneService } from './application/services/booking-milestone.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingCorrection,
      BookingFile,
      BookingMessage,
      BookingMilestone,
      BookingMilestoneEvidence,
      Order,
      Milestone,
      Dispute,
      Service,
      Profile,
    ]),
    PaymentModule,
    NotificationModule,
    AdminModule,
  ],
  controllers: [
    BookingController,
    OrderController,
    CheckoutController,
    BookingFileController,
    BookingChatController,
    BookingMilestoneController,
  ],
  providers: [BookingService, BookingFileService, BookingChatService, OrderService, BookingMilestoneService],
  exports: [BookingService, BookingFileService, BookingChatService, OrderService, BookingMilestoneService],
})
export class BookingModule {}
