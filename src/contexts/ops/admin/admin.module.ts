import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationReport } from './domain/entities/moderation-report.entity';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './presentation/admin.controller';
import { ModerationController } from './presentation/moderation.controller';
import { AdminOverviewController } from './presentation/admin-overview.controller';
import { AdminPermissionsController } from './presentation/admin-permissions.controller';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationReport]), ReportingModule],
  controllers: [AdminController, ModerationController, AdminOverviewController, AdminPermissionsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
