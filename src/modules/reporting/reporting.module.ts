import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { AuditLog } from './domain/entities/audit-log.entity';
import { User } from '../identity/domain/entities/user.entity';
import { Service } from '../service-catalog/domain/entities/service.entity';
import { Booking } from '../booking/domain/entities/booking.entity';
import { Advertisement } from '../advertisement/domain/entities/advertisement.entity';

// Services
import { ReportingService } from './application/services/reporting.service';

// Controllers
import { ReportingController } from './presentation/reporting.controller';
import { AnalyticsController } from './presentation/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      Service,
      Booking,
      Advertisement,
    ]),
  ],
  controllers: [ReportingController, AnalyticsController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
