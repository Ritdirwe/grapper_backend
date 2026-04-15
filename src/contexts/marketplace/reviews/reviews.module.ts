import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './domain/entities/review.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Booking } from '@contexts/marketplace/booking/domain/entities/booking.entity';
import { ReviewController } from './presentation/reviews.controller';
import { ReviewService } from './application/services/review.service';
import { NotificationModule } from '@contexts/community/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Service, Booking]), NotificationModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewsModule {}
