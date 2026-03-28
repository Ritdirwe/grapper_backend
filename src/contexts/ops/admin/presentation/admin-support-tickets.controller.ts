import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import { AuthUser } from '@shared/types/auth-user.type';
import {
  AddSupportTicketMessageDto,
  SupportTicketDetailResponseDto,
  SupportTicketListResponseDto,
  SupportTicketQueryDto,
  SupportTicketResponseDto,
  UpdateSupportTicketStatusDto,
} from '../application/dto/support-ticket.dto';
import { SupportTicketService } from '../application/services/support-ticket.service';

@ApiTags('Admin Support Tickets')
@ApiBearerAuth()
@Controller('admin/support/tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSupportTicketsController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Get()
  @Permissions(PERMISSIONS.OPS_MODERATION_REPORT_READ)
  @ApiOperation({ summary: 'Get support tickets for admin queue management' })
  @ApiResponse({ status: 200, type: Object })
  async listTickets(@Query() query: SupportTicketQueryDto): Promise<SupportTicketListResponseDto> {
    return this.supportTicketService.listAdminTickets(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.OPS_MODERATION_REPORT_READ)
  @ApiOperation({ summary: 'Get support ticket details with full message thread for admins' })
  @ApiResponse({ status: 200, type: Object })
  async getTicketDetail(@Param('id') ticketId: string): Promise<SupportTicketDetailResponseDto> {
    return this.supportTicketService.getTicketDetailForAdmin(ticketId, true);
  }

  @Post(':id/messages')
  @Permissions(PERMISSIONS.OPS_MODERATION_REPORT_RESOLVE)
  @ApiOperation({ summary: 'Reply to support ticket as admin' })
  @ApiResponse({ status: 200, type: Object })
  async addMessage(
    @CurrentUser() admin: AuthUser,
    @Param('id') ticketId: string,
    @Body() dto: AddSupportTicketMessageDto,
  ): Promise<SupportTicketDetailResponseDto> {
    return this.supportTicketService.addMessageAsAdmin(admin.id, ticketId, dto);
  }

  @Put(':id/status')
  @Permissions(PERMISSIONS.OPS_MODERATION_REPORT_RESOLVE)
  @ApiOperation({ summary: 'Update support ticket status as admin' })
  @ApiResponse({ status: 200, type: Object })
  async updateStatus(
    @Param('id') ticketId: string,
    @Body() dto: UpdateSupportTicketStatusDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportTicketService.updateTicketStatus(ticketId, dto);
  }
}
