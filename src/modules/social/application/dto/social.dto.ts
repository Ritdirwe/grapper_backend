import {
  IsString,
  IsEnum,
  IsArray,
  IsUrl,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostVisibility, LikeType } from '../../domain/value-objects/social-enums.vo';

// Post DTOs
export class CreatePostDto {
  @ApiProperty({ example: 'Hello world!', minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiProperty({ example: ['https://example.com/image.jpg'], isArray: true, required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  mediaUrls?: string[];

  @ApiProperty({ example: ['https://example.com/image.jpg'], isArray: true, required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ enum: PostVisibility, required: false })
  @IsEnum(PostVisibility)
  @IsOptional()
  visibility?: PostVisibility;
}

export class UpdatePostDto {
  @ApiProperty({ example: 'Updated content', required: false, minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsOptional()
  content?: string;

  @ApiProperty({ example: ['https://example.com/updated.jpg'], isArray: true, required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  mediaUrls?: string[];

  @ApiProperty({ enum: PostVisibility, required: false })
  @IsEnum(PostVisibility)
  @IsOptional()
  visibility?: PostVisibility;
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ isArray: true, required: false })
  mediaUrls?: string[];

  @ApiProperty({ enum: PostVisibility })
  visibility: PostVisibility;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  commentsCount: number;

  @ApiProperty()
  sharesCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  user?: {
    id: string;
    email: string;
    profile?: {
      fullName?: string;
      displayName?: string;
      avatar?: string;
    };
  };

  @ApiProperty({ required: false })
  isLiked?: boolean;
}

// Comment DTOs
export class CreateCommentDto {
  @ApiProperty({ example: 'Great post!', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class ReplyCommentDto {
  @ApiProperty({ example: 'Thank you!', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: 'Edited comment', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  parentCommentId?: string;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  user?: {
    id: string;
    email: string;
    profile?: {
      fullName?: string;
      displayName?: string;
      avatar?: string;
    };
  };

  @ApiProperty({ required: false })
  repliesCount?: number;

  @ApiProperty({ required: false })
  isLiked?: boolean;
}

// Like DTOs
export class LikePostDto {
  @ApiProperty({ enum: LikeType, required: false })
  @IsEnum(LikeType)
  @IsOptional()
  type?: LikeType;
}

export class LikeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false })
  postId?: string;

  @ApiProperty({ required: false })
  commentId?: string;

  @ApiProperty({ enum: LikeType })
  type: LikeType;

  @ApiProperty()
  createdAt: Date;
}

// Share DTOs
export class SharePostDto {
  @ApiProperty({ example: 'Check this out!', maxLength: 500, required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  caption?: string;
}

export class ShareResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  postId: string;

  @ApiProperty({ required: false })
  caption?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  user?: {
    id: string;
    email: string;
    profile?: {
      fullName?: string;
      displayName?: string;
    };
  };
}
