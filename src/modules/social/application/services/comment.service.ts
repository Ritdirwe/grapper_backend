import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../domain/entities/comment.entity';
import { Post } from '../../domain/entities/post.entity';
import { Like } from '../../domain/entities/like.entity';
import {
  CreateCommentDto,
  ReplyCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
} from '../dto/social.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
  ) {}

  async create(postId: string, userId: string, dto: CreateCommentDto): Promise<CommentResponseDto> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = this.commentRepository.create({
      postId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Increment post comment count
    post.incrementComments();
    await this.postRepository.save(post);

    return this.mapToResponseDto(comment, userId);
  }

  async reply(commentId: string, userId: string, dto: ReplyCommentDto): Promise<CommentResponseDto> {
    const parentComment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['post'],
    });

    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }

    const reply = this.commentRepository.create({
      postId: parentComment.postId,
      userId,
      content: dto.content,
      parentCommentId: commentId,
    });

    await this.commentRepository.save(reply);

    // Increment post comment count
    const post = await this.postRepository.findOne({ where: { id: parentComment.postId } });
    if (post) {
      post.incrementComments();
      await this.postRepository.save(post);
    }

    return this.mapToResponseDto(reply, userId);
  }

  async update(id: string, userId: string, dto: UpdateCommentDto): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    await this.commentRepository.save(comment);

    return this.mapToResponseDto(comment, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Decrement post comment count
    const post = await this.postRepository.findOne({ where: { id: comment.postId } });
    if (post) {
      post.decrementComments();
      await this.postRepository.save(post);
    }

    await this.commentRepository.remove(comment);
  }

  async getPostComments(postId: string, currentUserId: string, page = 1, limit = 20): Promise<CommentResponseDto[]> {
    const comments = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('comment.post_id = :postId', { postId })
      .andWhere('comment.parent_comment_id IS NULL')
      .orderBy('comment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return Promise.all(comments.map(comment => this.mapToResponseDto(comment, currentUserId)));
  }

  async getReplies(commentId: string, currentUserId: string, page = 1, limit = 10): Promise<CommentResponseDto[]> {
    const replies = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('comment.parent_comment_id = :commentId', { commentId })
      .orderBy('comment.created_at', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return Promise.all(replies.map(reply => this.mapToResponseDto(reply, currentUserId)));
  }

  private async mapToResponseDto(comment: Comment, currentUserId?: string): Promise<CommentResponseDto> {
    let isLiked = false;
    let repliesCount = 0;

    if (currentUserId) {
      const like = await this.likeRepository.findOne({
        where: { userId: currentUserId, commentId: comment.id },
      });
      isLiked = !!like;
    }

    if (!comment.parentCommentId) {
      repliesCount = await this.commentRepository.count({
        where: { parentCommentId: comment.id },
      });
    }

    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      likesCount: comment.likesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user ? {
        id: comment.user.id,
        email: comment.user.email,
        profile: comment.user.profile ? {
          fullName: comment.user.profile.fullName,
          displayName: comment.user.profile.displayName,
          avatar: comment.user.profile.avatarUrl,
        } : undefined,
      } : undefined,
      repliesCount,
      isLiked,
    };
  }
}
