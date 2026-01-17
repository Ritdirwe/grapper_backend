import {
  IsString,
  IsArray,
  IsUrl,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConversationType } from '../../domain/value-objects/messaging-enums.vo';

// Conversation DTOs
export class CreateConversationDto {
  @ApiProperty({ example: ['uuid-of-user-1', 'uuid-of-user-2'], isArray: true })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  participantIds: string[];

  @ApiProperty({ example: 'Marketing Team', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Hi everyone!', required: false })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}

export class UpdateConversationDto {
  @ApiProperty({ example: 'Updated Group Name', required: false, maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsUrl()
  @IsOptional()
  groupAvatar?: string;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ConversationType })
  type: ConversationType;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  groupAvatar?: string;

  @ApiProperty({ required: false })
  lastMessageAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ isArray: true, required: false })
  participants?: {
    id: string;
    userId: string;
    user?: {
      id: string;
      email: string;
      profile?: {
        fullName?: string;
        displayName?: string;
        avatar?: string;
      };
    };
  }[];

  @ApiProperty({ required: false })
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  };

  @ApiProperty({ required: false })
  unreadCount?: number;
}

// Message DTOs
export class SendMessageDto {
  @ApiProperty({ example: 'Hello, how are you?', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiProperty({ example: ['https://example.com/attachment.pdf'], isArray: true, required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  mediaUrls?: string[];

  @ApiProperty({ example: 'uuid-of-message', required: false })
  @IsUUID()
  @IsOptional()
  replyToMessageId?: string;
}

export class UpdateMessageDto {
  @ApiProperty({ example: 'Edited message content', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ isArray: true, required: false })
  mediaUrls?: string[];

  @ApiProperty({ required: false })
  replyToMessageId?: string;

  @ApiProperty({ isArray: true })
  readBy: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  deletedAt?: Date;

  @ApiProperty({ required: false })
  sender?: {
    id: string;
    email: string;
    profile?: {
      fullName?: string;
      displayName?: string;
      avatar?: string;
    };
  };

  @ApiProperty({ required: false })
  replyToMessage?: {
    id: string;
    content: string;
    senderId: string;
  };
}

// Participant DTOs
export class AddParticipantDto {
  @ApiProperty({ example: 'uuid-of-user-to-add' })
  @IsUUID()
  userId: string;
}

export class MarkAsReadDto {
  @ApiProperty({ example: 'uuid-of-message-to-mark-read' })
  @IsUUID()
  messageId: string;
}
