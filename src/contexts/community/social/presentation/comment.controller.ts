import {
  Controller,
  Put,
  Delete,
  Body,
  Param,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CommentService } from '../application/services/comment.service';
import { LikeService } from '../application/services/like.service';
import {
  UpdateCommentDto,
  ReplyCommentDto,
  CommentResponseDto,
  LikePostDto,
} from '../application/dto/social.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Social Comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly likeService: LikeService,
  ) {}

  @Put(':id')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_UPDATE_OWN)
  @ApiOperation({ summary: 'Update an existing comment' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  async updateComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_DELETE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204 })
  async deleteComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commentService.delete(id, user.id);
  }

  @Post(':id/reply')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_CREATE)
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async replyToComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplyCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentService.reply(id, user.id, dto);
  }

  @Get(':id/replies')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_READ)
  @ApiOperation({ summary: 'Get replies for a comment' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  async getReplies(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<CommentResponseDto[]> {
    return this.commentService.getReplies(id, user.id, page, limit);
  }

  @Post(':commentId/like')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_INTERACT)
  @ApiOperation({ summary: 'Like a comment' })
  @ApiResponse({ status: 201 })
  async likeComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
    @Body() dto: LikePostDto,
  ) {
    return this.likeService.likeComment(commentId, user.id, dto);
  }

  @Delete(':commentId/like')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_INTERACT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiResponse({ status: 204 })
  async unlikeComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    return this.likeService.unlikeComment(commentId, user.id);
  }
}
