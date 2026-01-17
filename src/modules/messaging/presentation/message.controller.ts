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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Real-time Messaging')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update a sent message (Edit content)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async updateMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message (Soft delete)' })
  @ApiResponse({ status: 204 })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.messageService.delete(id, user.id);
  }
}
