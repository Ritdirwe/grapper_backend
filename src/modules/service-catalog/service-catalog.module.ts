import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Category } from './domain/entities/category.entity';
import { Service } from './domain/entities/service.entity';
import { ServiceImage } from './domain/entities/service-image.entity';
import { Review } from './domain/entities/review.entity';
import { Profile } from '../user-management/domain/entities/profile.entity';

// Services
import { CategoryService } from './application/services/category.service';
import { ServiceService } from './application/services/service.service';
import { ReviewService } from './application/services/review.service';

// Controllers
import { CategoryController } from './presentation/category.controller';
import { ServiceController } from './presentation/service.controller';
import { ReviewController } from './presentation/review.controller';
import { DiscoveryController } from './presentation/discovery.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Service,
      ServiceImage,
      Review,
      Profile,
    ]),
  ],
  controllers: [
    CategoryController,
    ServiceController,
    ReviewController,
    DiscoveryController,
  ],
  providers: [CategoryService, ServiceService, ReviewService],
  exports: [CategoryService, ServiceService, ReviewService],
})
export class ServiceCatalogModule {}
