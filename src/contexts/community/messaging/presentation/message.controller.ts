import {
  Controller,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from '../application/services/message.service';
import {
  UpdateMessageDto,
  MessageResponseDto,
} from '../application/dto/messaging.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Real-time Messaging')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Put(':id')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_UPDATE_OWN)
  @ApiOperation({ summary: 'Update a sent message (Edit content)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async updateMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMUNITY_MESSAGE_DELETE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message (Soft delete)' })
  @ApiResponse({ status: 204 })
  async deleteMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.messageService.delete(id, user.id);
  }
}
