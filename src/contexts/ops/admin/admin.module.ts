import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationReport } from './domain/entities/moderation-report.entity';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './presentation/admin.controller';
import { ModerationController } from './presentation/moderation.controller';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationReport]), ReportingModule],
  controllers: [AdminController, ModerationController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
