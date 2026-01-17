import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities from various domains
import { ModerationReport } from './domain/entities/moderation-report.entity';
import { User } from '../identity/domain/entities/user.entity';
import { Service } from '../service-catalog/domain/entities/service.entity';
import { Booking } from '../booking/domain/entities/booking.entity';
import { Post } from '../social/domain/entities/post.entity';
import { Comment } from '../social/domain/entities/comment.entity';
import { Advertisement } from '../advertisement/domain/entities/advertisement.entity';

// Services
import { AdminService } from './application/services/admin.service';

// Controllers
import { AdminController } from './presentation/admin.controller';
import { ModerationController } from './presentation/moderation.controller';
import { Subscription } from '../subscription/domain/entities/subscription.entity';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Service,
      Booking,
      Post,
      Comment,
      Advertisement,
      ModerationReport,
      Subscription,
    ]),
    ReportingModule,
  ],
  controllers: [AdminController, ModerationController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
