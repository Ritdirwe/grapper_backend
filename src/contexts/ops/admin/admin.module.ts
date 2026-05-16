import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationReport } from './domain/entities/moderation-report.entity';
import { Review } from '@contexts/marketplace/reviews/domain/entities/review.entity';
import { SupportTicket } from './domain/entities/support-ticket.entity';
import { SupportTicketMessage } from './domain/entities/support-ticket-message.entity';
import { AdminPenaltySetting } from './domain/entities/admin-penalty-setting.entity';
import { AdminService } from './application/services/admin.service';
import { SupportTicketService } from './application/services/support-ticket.service';
import { AdminPenaltySettingsService } from './application/services/admin-penalty-settings.service';
import { AdminController } from './presentation/admin.controller';
import { ModerationController } from './presentation/moderation.controller';
import { AdminOverviewController } from './presentation/admin-overview.controller';
import { AdminPermissionsController } from './presentation/admin-permissions.controller';
import { SupportTicketsController } from './presentation/support-tickets.controller';
import { AdminSupportTicketsController } from './presentation/admin-support-tickets.controller';
import { AdminPenaltySettingsController } from './presentation/admin-penalty-settings.controller';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationReport, Review, SupportTicket, SupportTicketMessage, AdminPenaltySetting]), ReportingModule],
  controllers: [
    AdminController,
    ModerationController,
    AdminOverviewController,
    AdminPermissionsController,
    SupportTicketsController,
    AdminSupportTicketsController,
    AdminPenaltySettingsController,
  ],
  providers: [AdminService, SupportTicketService, AdminPenaltySettingsService],
  exports: [AdminService, SupportTicketService, AdminPenaltySettingsService],
})
export class AdminModule {}
