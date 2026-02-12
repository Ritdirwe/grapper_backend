import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../domain/entities/post.entity';
import { Like } from '../../domain/entities/like.entity';
import { Hashtag } from '../../domain/entities/hashtag.entity';
import { UserFollow } from '@contexts/identity/user-management/domain/entities/user-follow.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  PostResponseDto,
} from '../dto/social.dto';
import { PostVisibility } from '../../domain/value-objects/social-enums.vo';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(UserFollow)
    private followRepository: Repository<UserFollow>,
    @InjectRepository(Hashtag)
    private hashtagRepository: Repository<Hashtag>,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<PostResponseDto> {
    const post = this.postRepository.create({
      userId,
      content: dto.content,
      mediaUrls: dto.mediaUrls || dto.images,
      visibility: dto.visibility || PostVisibility.PUBLIC,
    });

    await this.postRepository.save(post);

    // Process hashtags
    await this.syncHashtags(post, dto.content);

    return this.mapToResponseDto(post, userId);
  }

  async findById(id: string, currentUserId?: string): Promise<PostResponseDto> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check visibility
    if (post.visibility === PostVisibility.PRIVATE && post.userId !== currentUserId) {
      throw new ForbiddenException('This post is private');
    }

    if (post.visibility === PostVisibility.FOLLOWERS && post.userId !== currentUserId) {
      const isFollowing = await this.followRepository.findOne({
        where: { followerId: currentUserId, followingId: post.userId },
      });

      if (!isFollowing) {
        throw new ForbiddenException('You must follow this user to see their posts');
      }
    }

    return this.mapToResponseDto(post, currentUserId);
  }

  async update(id: string, userId: string, dto: UpdatePostDto): Promise<PostResponseDto> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    if (dto.content !== undefined) post.content = dto.content;
    if (dto.mediaUrls !== undefined) post.mediaUrls = dto.mediaUrls;
    if (dto.visibility !== undefined) post.visibility = dto.visibility;

    await this.postRepository.save(post);

    // Refresh hashtags if content changed
    if (dto.content !== undefined) {
      await this.syncHashtags(post, post.content);
    }

    return this.mapToResponseDto(post, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepository.remove(post);
  }

  async getFeed(userId: string, page = 1, limit = 20): Promise<{ data: PostResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    // Get user's following list
    const following = await this.followRepository.find({
      where: { followerId: userId },
      select: ['followingId'],
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Include own posts

    const [posts, total] = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('post.user_id IN (:...userIds)', { userIds: followingIds })
      .andWhere('(post.visibility = :public OR post.visibility = :followers OR post.user_id = :userId)', {
        public: PostVisibility.PUBLIC,
        followers: PostVisibility.FOLLOWERS,
        userId,
      })
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await Promise.all(posts.map(post => this.mapToResponseDto(post, userId)));
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getDiscover(userId: string, page = 1, limit = 20): Promise<{ data: PostResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const [posts, total] = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('post.visibility = :public', { public: PostVisibility.PUBLIC })
      .orderBy('post.likesCount', 'DESC')
      .addOrderBy('post.commentsCount', 'DESC')
      .addOrderBy('post.sharesCount', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await Promise.all(posts.map(post => this.mapToResponseDto(post, userId)));
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUserPosts(targetUserId: string, currentUserId: string, page = 1, limit = 20): Promise<PostResponseDto[]> {
    let query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('post.user_id = :targetUserId', { targetUserId });

    // If viewing own posts, show all
    if (targetUserId === currentUserId) {
      // Show all posts
    } else {
      // Check if following
      const isFollowing = await this.followRepository.findOne({
        where: { followerId: currentUserId, followingId: targetUserId },
      });

      if (isFollowing) {
        query = query.andWhere('post.visibility IN (:...visibilities)', {
          visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS],
        });
      } else {
        query = query.andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC });
      }
    }

    const posts = await query
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return Promise.all(posts.map(post => this.mapToResponseDto(post, currentUserId)));
  }

  async getStats(id: string): Promise<{ likes: number; comments: number; shares: number }> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      likes: post.likesCount,
      comments: post.commentsCount,
      shares: post.sharesCount,
    };
  }

  async getTrendingHashtags(limit = 10): Promise<{ name: string; postsCount: number }[]> {
    return this.hashtagRepository.find({
      order: { postsCount: 'DESC', lastUsedAt: 'DESC' },
      take: limit,
      select: ['name', 'postsCount'],
    });
  }

  async getPostsByHashtag(hashtagName: string, userId: string, page = 1, limit = 20): Promise<PostResponseDto[]> {
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .innerJoin('post.hashtags', 'hashtag', 'hashtag.name = :name', { name: hashtagName.toLowerCase() })
      .where('(post.visibility = :public OR post.user_id = :userId)', {
        public: PostVisibility.PUBLIC,
        userId,
      })
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return Promise.all(posts.map(post => this.mapToResponseDto(post, userId)));
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    if (!matches) return [];
    
    // Normalize: remove # and lowercase, take unique values
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
  }

  private async syncHashtags(post: Post, content: string): Promise<void> {
    const hashtagNames = this.extractHashtags(content);
    
    // Find or create hashtags
    const hashtags: Hashtag[] = [];
    for (const name of hashtagNames) {
      let hashtag = await this.hashtagRepository.findOne({ where: { name } });
      if (!hashtag) {
        hashtag = this.hashtagRepository.create({ name, postsCount: 0 });
        await this.hashtagRepository.save(hashtag);
      }
      hashtags.push(hashtag);
    }
    
    // Update relationships
    // We need to load previous hashtags to update counts properly if we were being thorough,
    // but for now let's just update the relationship.
    // To be precise, TypeORM handles the join table. 
    // We also need to increment postsCount for each new hashtag.
    
    // Load current hashtags to compare
    const currentPost = await this.postRepository.findOne({
      where: { id: post.id },
      relations: ['hashtags'],
    });

    const currentTags = currentPost?.hashtags || [];
    const currentTagNames = currentTags.map(t => t.name);
    
    // tags to add
    const toAdd = hashtags.filter(h => !currentTagNames.includes(h.name));
    // tags to remove
    const toRemove = currentTags.filter(h => !hashtagNames.includes(h.name));

    for (const tag of toAdd) {
      tag.postsCount++;
      await this.hashtagRepository.save(tag);
    }

    for (const tag of toRemove) {
      if (tag.postsCount > 0) {
        tag.postsCount--;
        await this.hashtagRepository.save(tag);
      }
    }

    post.hashtags = hashtags;
    await this.postRepository.save(post);
  }

  private async mapToResponseDto(post: Post, currentUserId?: string): Promise<PostResponseDto> {
    let isLiked = false;

    if (currentUserId) {
      const like = await this.likeRepository.findOne({
        where: { userId: currentUserId, postId: post.id },
      });
      isLiked = !!like;
    }

    return {
      id: post.id,
      userId: post.userId,
      content: post.content,
      mediaUrls: post.mediaUrls,
      visibility: post.visibility,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: post.user ? {
        id: post.user.id,
        email: post.user.email,
        profile: post.user.profile ? {
          fullName: post.user.profile.fullName,
          displayName: post.user.profile.displayName,
          avatar: post.user.profile.avatarUrl,
        } : undefined,
      } : undefined,
      isLiked,
    };
  }
}
