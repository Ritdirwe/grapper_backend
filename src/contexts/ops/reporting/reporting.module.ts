import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PLATFORM_READ_CONTRACT } from '@shared/contracts/platform-read.contract';
import { AuditLog } from './domain/entities/audit-log.entity';
import { ReportingService } from './application/services/reporting.service';
import { PlatformReadService } from './infrastructure/platform-read.service';
import { ReportingController } from './presentation/reporting.controller';
import { AnalyticsController } from './presentation/analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [ReportingController, AnalyticsController],
  providers: [
    ReportingService,
    PlatformReadService,
    {
      provide: PLATFORM_READ_CONTRACT,
      useExisting: PlatformReadService,
    },
  ],
  exports: [ReportingService, PLATFORM_READ_CONTRACT],
})
export class ReportingModule {}
