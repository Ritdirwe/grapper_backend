import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from '../../domain/entities/like.entity';
import { Post } from '../../domain/entities/post.entity';
import { Comment } from '../../domain/entities/comment.entity';
import { LikeType } from '../../domain/value-objects/social-enums.vo';
import { LikePostDto, LikeResponseDto } from '../dto/social.dto';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async likePost(postId: string, userId: string, dto: LikePostDto): Promise<LikeResponseDto> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existingLike = await this.likeRepository.findOne({
      where: { userId, postId },
    });

    if (existingLike) {
      throw new BadRequestException('You already liked this post');
    }

    const like = this.likeRepository.create({
      userId,
      postId,
      type: dto.type || LikeType.LIKE,
    });

    await this.likeRepository.save(like);

    // Increment post likes count
    post.incrementLikes();
    await this.postRepository.save(post);

    return this.mapToResponseDto(like);
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const like = await this.likeRepository.findOne({
      where: { userId, postId },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.likeRepository.remove(like);

    // Decrement post likes count
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (post) {
      post.decrementLikes();
      await this.postRepository.save(post);
    }
  }

  async likeComment(commentId: string, userId: string, dto: LikePostDto): Promise<LikeResponseDto> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if already liked
    const existingLike = await this.likeRepository.findOne({
      where: { userId, commentId },
    });

    if (existingLike) {
      throw new BadRequestException('You already liked this comment');
    }

    const like = this.likeRepository.create({
      userId,
      commentId,
      type: dto.type || LikeType.LIKE,
    });

    await this.likeRepository.save(like);

    // Increment comment likes count
    comment.incrementLikes();
    await this.commentRepository.save(comment);

    return this.mapToResponseDto(like);
  }

  async unlikeComment(commentId: string, userId: string): Promise<void> {
    const like = await this.likeRepository.findOne({
      where: { userId, commentId },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.likeRepository.remove(like);

    // Decrement comment likes count
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (comment) {
      comment.decrementLikes();
      await this.commentRepository.save(comment);
    }
  }

  private mapToResponseDto(like: Like): LikeResponseDto {
    return {
      id: like.id,
      userId: like.userId,
      postId: like.postId,
      commentId: like.commentId,
      type: like.type,
      createdAt: like.createdAt,
    };
  }
}
