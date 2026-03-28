import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationReport } from './domain/entities/moderation-report.entity';
import { SupportTicket } from './domain/entities/support-ticket.entity';
import { SupportTicketMessage } from './domain/entities/support-ticket-message.entity';
import { AdminService } from './application/services/admin.service';
import { SupportTicketService } from './application/services/support-ticket.service';
import { AdminController } from './presentation/admin.controller';
import { ModerationController } from './presentation/moderation.controller';
import { AdminOverviewController } from './presentation/admin-overview.controller';
import { AdminPermissionsController } from './presentation/admin-permissions.controller';
import { SupportTicketsController } from './presentation/support-tickets.controller';
import { AdminSupportTicketsController } from './presentation/admin-support-tickets.controller';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationReport, SupportTicket, SupportTicketMessage]), ReportingModule],
  controllers: [
    AdminController,
    ModerationController,
    AdminOverviewController,
    AdminPermissionsController,
    SupportTicketsController,
    AdminSupportTicketsController,
  ],
  providers: [AdminService, SupportTicketService],
  exports: [AdminService, SupportTicketService],
})
export class AdminModule {}
