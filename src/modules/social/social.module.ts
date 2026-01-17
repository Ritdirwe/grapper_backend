import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Post } from './domain/entities/post.entity';
import { Comment } from './domain/entities/comment.entity';
import { Like } from './domain/entities/like.entity';
import { Share } from './domain/entities/share.entity';
import { Hashtag } from './domain/entities/hashtag.entity';
import { UserFollow } from '../user-management/domain/entities/user-follow.entity';

// Services
import { PostService } from './application/services/post.service';
import { CommentService } from './application/services/comment.service';
import { LikeService } from './application/services/like.service';
import { ShareService } from './application/services/share.service';

// Controllers
import { PostController } from './presentation/post.controller';
import { CommentController } from './presentation/comment.controller';
import { ShareController } from './presentation/share.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, Like, Share, Hashtag, UserFollow]),
  ],
  controllers: [PostController, CommentController, ShareController],
  providers: [PostService, CommentService, LikeService, ShareService],
  exports: [PostService, CommentService, LikeService, ShareService],
})
export class SocialModule {}
