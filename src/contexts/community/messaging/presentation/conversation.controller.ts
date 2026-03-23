import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationService } from '../application/services/conversation.service';
import { MessageService } from '../application/services/message.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationResponseDto,
  SendMessageDto,
  MessageResponseDto,
  AddParticipantDto,
  MarkAsReadDto,
} from '../application/dto/messaging.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Real-time Messaging')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.COMMUNITY_CONVERSATION_READ_OWN)
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ConversationResponseDto[]> {
    return this.conversationService.findAll(user.id, page, limit);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.COMMUNITY_CONVERSATION_READ_OWN)
  @ApiOperation({ summary: 'Get conversation details by ID' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async getConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.findById(id, user.id);
  }

  @Post()
  @Permissions(PERMISSIONS.COMMUNITY_CONVERSATION_CREATE_OWN)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  async createConversation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.create(user.id, dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.COMMUNITY_CONVERSATION_UPDATE_OWN)
  @ApiOperation({ summary: 'Update conversation settings' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async updateConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMUNITY_CONVERSATION_DELETE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 204 })
  async deleteConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.conversationService.delete(id, user.id);
  }

  @Post(':id/participants')
  @Permissions(PERMISSIONS.COMMUNITY_CONVERSATION_PARTICIPANT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a participant to a group conversation' })
  @ApiResponse({ status: 204 })
  async addParticipant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
  ): Promise<void> {
    return this.conversationService.addParticipant(id, user.id, dto);
  }

  // Messages
  @Get(':id/messages')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_READ_OWN)
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<MessageResponseDto[]> {
    return this.messageService.findByConversation(id, user.id, page, limit);
  }

  @Post(':id/messages')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_SEND_OWN)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.send(id, user.id, dto);
  }

  @Post(':id/read')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_READ_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a specific message as read' })
  @ApiResponse({ status: 204 })
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MarkAsReadDto,
  ): Promise<void> {
    return this.messageService.markAsRead(id, user.id, dto);
  }

  @Post(':id/read-all')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_READ_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 204 })
  async markAllAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.messageService.markAllAsRead(id, user.id);
  }

  @Get(':id/unread-count')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_READ_OWN)
  @ApiOperation({ summary: 'Get count of unread messages in a conversation' })
  @ApiResponse({ status: 200 })
  async getUnreadCount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ count: number }> {
    const count = await this.conversationService.getUnreadCount(id, user.id);
    return { count };
  }
}
