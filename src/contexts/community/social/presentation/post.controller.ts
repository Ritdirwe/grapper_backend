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
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from '../application/services/post.service';
import { CommentService } from '../application/services/comment.service';
import { LikeService } from '../application/services/like.service';
import { ShareService } from '../application/services/share.service';
import {
  CreatePostDto,
  UpdatePostDto,
  PostResponseDto,
  CreateCommentDto,
  ReplyCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
  LikePostDto,
  SharePostDto,
  ShareResponseDto,
} from '../application/dto/social.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StorageService } from '@infrastructure/storage/storage.service';
import { PostVisibility } from '../domain/value-objects/social-enums.vo';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Social Posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly likeService: LikeService,
    private readonly shareService: ShareService,
    private readonly storageService: StorageService,
  ) {}

  @Get('feed')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Get current user social feed' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getFeed(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: PostResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.postService.getFeed(user.id, page, limit);
  }

  @Get('discover')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Discover new posts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getDiscover(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: PostResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.postService.getDiscover(user.id, page, limit);
  }

  @Get('user/:userId')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Get posts by a specific user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getUserPosts(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PostResponseDto[]> {
    return this.postService.getUserPosts(userId, user.id, page, limit);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Get post details by ID' })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async getPost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<PostResponseDto> {
    return this.postService.findById(id, user.id);
  }

  @Post('')
  @Permissions(PERMISSIONS.COMMUNITY_POST_CREATE)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        visibility: { type: 'string', enum: ['public', 'followers', 'private'] },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: PostResponseDto })
  async createPost(
    @Req() req: any,
  ): Promise<PostResponseDto> {
    // Get user from request (set by JWT guard)
    const user = req.user;
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Handle multipart form data
    const body = req.body ?? {};
    let content = String(body.content ?? '').trim();
    let visibility = String(body.visibility ?? 'public').trim() || 'public';
    const mediaUrls: string[] = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
    const bodyImages = body.images;

    const uploadPart = async (filePart: any) => {
      if (!filePart) {
        return;
      }

      const buffer = filePart.toBuffer ? await filePart.toBuffer() : Buffer.isBuffer(filePart) ? filePart : null;
      if (!buffer) {
        return;
      }

      const filename = filePart.filename || `upload-${Date.now()}.bin`;
      const mimetype = filePart.mimetype || 'application/octet-stream';
      const path = `posts/${Date.now()}-${filename}`;
      const url = await this.storageService.uploadFile(buffer, path, mimetype);
      mediaUrls.push(url);
    };

    if (Array.isArray(bodyImages)) {
      for (const image of bodyImages) {
        await uploadPart(image);
      }
    } else if (bodyImages) {
      await uploadPart(bodyImages);
    }

    if (!bodyImages && req.parts) {
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          await uploadPart(part);
          continue;
        }

        const value = String(part.value ?? '').trim();
        if (part.fieldname === 'content' && value) content = value;
        if (part.fieldname === 'visibility' && value) visibility = value;
      }
    }

    if (!content) {
      throw new BadRequestException('Post content is required');
    }

    return this.postService.create(user.id, { 
      content, 
      visibility: visibility as PostVisibility, 
      mediaUrls 
    });
  }

  @Put(':id')
  @Permissions(PERMISSIONS.COMMUNITY_POST_UPDATE_OWN)
  @ApiOperation({ summary: 'Update an existing post' })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async updatePost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMUNITY_POST_DELETE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 204 })
  async deletePost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.postService.delete(id, user.id);
  }

  @Get(':id/stats')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Get post engagement statistics' })
  @ApiResponse({ status: 200 })
  async getStats(@Param('id') id: string) {
    return this.postService.getStats(id);
  }

  @Get('hashtags/trending')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Get trending hashtags' })
  @ApiResponse({ status: 200 })
  async getTrendingHashtags(@Query('limit') limit?: number) {
    return this.postService.getTrendingHashtags(limit);
  }

  @Get('hashtags/:tag')
  @Permissions(PERMISSIONS.COMMUNITY_POST_READ)
  @ApiOperation({ summary: 'Get posts by hashtag' })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getPostsByHashtag(
    @CurrentUser() user: AuthUser,
    @Param('tag') tag: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PostResponseDto[]> {
    return this.postService.getPostsByHashtag(tag, user.id, page, limit);
  }

  // Comments
  @Get(':postId/comments')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_READ)
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  async getComments(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<CommentResponseDto[]> {
    return this.commentService.getPostComments(postId, user.id, page, limit);
  }

  @Post(':postId/comments')
  @Permissions(PERMISSIONS.COMMUNITY_COMMENT_CREATE)
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async createComment(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentService.create(postId, user.id, dto);
  }

  // Likes
  @Post(':postId/like')
  @Permissions(PERMISSIONS.COMMUNITY_POST_INTERACT)
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 201 })
  async likePost(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: LikePostDto,
  ) {
    return this.likeService.likePost(postId, user.id, dto);
  }

  @Delete(':postId/like')
  @Permissions(PERMISSIONS.COMMUNITY_POST_INTERACT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 204 })
  async unlikePost(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
  ): Promise<void> {
    return this.likeService.unlikePost(postId, user.id);
  }

  // Shares
  @Post(':postId/share')
  @Permissions(PERMISSIONS.COMMUNITY_SHARE_CREATE)
  @ApiOperation({ summary: 'Share a post' })
  @ApiResponse({ status: 201, type: ShareResponseDto })
  async sharePost(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: SharePostDto,
  ): Promise<ShareResponseDto> {
    return this.shareService.sharePost(postId, user.id, dto);
  }

  @Get(':postId/shares')
  @Permissions(PERMISSIONS.COMMUNITY_SHARE_READ)
  @ApiOperation({ summary: 'Get users who shared a post' })
  @ApiResponse({ status: 200, type: [ShareResponseDto] })
  async getShares(
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ShareResponseDto[]> {
    return this.shareService.getPostShares(postId, page, limit);
  }
}
