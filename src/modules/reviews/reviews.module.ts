
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './domain/entities/review.entity';
import { Service } from '../service-catalog/domain/entities/service.entity';
import { ReviewController } from './presentation/reviews.controller';
import { ReviewService } from './application/services/review.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      Service,
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewsModule {}
