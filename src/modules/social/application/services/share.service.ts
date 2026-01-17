import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Share } from '../../domain/entities/share.entity';
import { Post } from '../../domain/entities/post.entity';
import { SharePostDto, ShareResponseDto } from '../dto/social.dto';

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(Share)
    private shareRepository: Repository<Share>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async sharePost(postId: string, userId: string, dto: SharePostDto): Promise<ShareResponseDto> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const share = this.shareRepository.create({
      userId,
      postId,
      caption: dto.caption,
    });

    await this.shareRepository.save(share);

    // Increment post shares count
    post.incrementShares();
    await this.postRepository.save(post);

    return this.mapToResponseDto(share);
  }

  async getPostShares(postId: string, page = 1, limit = 20): Promise<ShareResponseDto[]> {
    const shares = await this.shareRepository
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('share.post_id = :postId', { postId })
      .orderBy('share.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return shares.map(share => this.mapToResponseDto(share));
  }

  async deleteShare(id: string, userId: string): Promise<void> {
    const share = await this.shareRepository.findOne({ where: { id, userId } });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Decrement post shares count
    const post = await this.postRepository.findOne({ where: { id: share.postId } });
    if (post) {
      post.decrementShares();
      await this.postRepository.save(post);
    }

    await this.shareRepository.remove(share);
  }

  private mapToResponseDto(share: Share): ShareResponseDto {
    return {
      id: share.id,
      userId: share.userId,
      postId: share.postId,
      caption: share.caption,
      createdAt: share.createdAt,
      user: share.user ? {
        id: share.user.id,
        email: share.user.email,
        profile: share.user.profile ? {
          fullName: share.user.profile.fullName,
          displayName: share.user.profile.displayName,
        } : undefined,
      } : undefined,
    };
  }
}
