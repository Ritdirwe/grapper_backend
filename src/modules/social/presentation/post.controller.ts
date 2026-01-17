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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Social Posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly likeService: LikeService,
    private readonly shareService: ShareService,
  ) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get current user social feed' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getFeed(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PostResponseDto[]> {
    return this.postService.getFeed(user.id, page, limit);
  }

  @Get('discover')
  @ApiOperation({ summary: 'Discover new posts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getDiscover(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PostResponseDto[]> {
    return this.postService.getDiscover(user.id, page, limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get posts by a specific user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getUserPosts(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PostResponseDto[]> {
    return this.postService.getUserPosts(userId, user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post details by ID' })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async getPost(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PostResponseDto> {
    return this.postService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, type: PostResponseDto })
  async createPost(
    @CurrentUser() user: User,
    @Body() dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.postService.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing post' })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async updatePost(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 204 })
  async deletePost(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.postService.delete(id, user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get post engagement statistics' })
  @ApiResponse({ status: 200 })
  async getStats(@Param('id') id: string) {
    return this.postService.getStats(id);
  }

  @Get('hashtags/trending')
  @ApiOperation({ summary: 'Get trending hashtags' })
  @ApiResponse({ status: 200 })
  async getTrendingHashtags(@Query('limit') limit?: number) {
    return this.postService.getTrendingHashtags(limit);
  }

  @Get('hashtags/:tag')
  @ApiOperation({ summary: 'Get posts by hashtag' })
  @ApiResponse({ status: 200, type: [PostResponseDto] })
  async getPostsByHashtag(
    @CurrentUser() user: User,
    @Param('tag') tag: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PostResponseDto[]> {
    return this.postService.getPostsByHashtag(tag, user.id, page, limit);
  }

  // Comments
  @Get(':postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  async getComments(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<CommentResponseDto[]> {
    return this.commentService.getPostComments(postId, user.id, page, limit);
  }

  @Post(':postId/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async createComment(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentService.create(postId, user.id, dto);
  }

  // Likes
  @Post(':postId/like')
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 201 })
  async likePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() dto: LikePostDto,
  ) {
    return this.likeService.likePost(postId, user.id, dto);
  }

  @Delete(':postId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 204 })
  async unlikePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
  ): Promise<void> {
    return this.likeService.unlikePost(postId, user.id);
  }

  // Shares
  @Post(':postId/share')
  @ApiOperation({ summary: 'Share a post' })
  @ApiResponse({ status: 201, type: ShareResponseDto })
  async sharePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() dto: SharePostDto,
  ): Promise<ShareResponseDto> {
    return this.shareService.sharePost(postId, user.id, dto);
  }

  @Get(':postId/shares')
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
