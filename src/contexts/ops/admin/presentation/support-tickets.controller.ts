import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import {
  AddSupportTicketMessageDto,
  CreateSupportTicketDto,
  SupportTicketDetailResponseDto,
  SupportTicketListResponseDto,
  SupportTicketQueryDto,
} from '../application/dto/support-ticket.dto';
import { SupportTicketService } from '../application/services/support-ticket.service';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a support ticket for payment, order, or service complaints' })
  @ApiResponse({ status: 201, type: Object })
  async createTicket(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupportTicketDto,
  ): Promise<SupportTicketDetailResponseDto> {
    return this.supportTicketService.createTicket(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user support tickets' })
  @ApiResponse({ status: 200, type: Object })
  async listMyTickets(
    @CurrentUser() user: AuthUser,
    @Query() query: SupportTicketQueryDto,
  ): Promise<SupportTicketListResponseDto> {
    return this.supportTicketService.listMyTickets(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket details for current user' })
  @ApiResponse({ status: 200, type: Object })
  async getMyTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') ticketId: string,
  ): Promise<SupportTicketDetailResponseDto> {
    return this.supportTicketService.getMyTicketDetail(user.id, ticketId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Reply to a support ticket as current user' })
  @ApiResponse({ status: 200, type: Object })
  async addMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') ticketId: string,
    @Body() dto: AddSupportTicketMessageDto,
  ): Promise<SupportTicketDetailResponseDto> {
    return this.supportTicketService.addMessageAsUser(user, ticketId, dto);
  }
}
