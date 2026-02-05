import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Category } from './domain/entities/category.entity';
import { Service } from './domain/entities/service.entity';
import { ServiceImage } from './domain/entities/service-image.entity';
import { Profile } from '../user-management/domain/entities/profile.entity';
import { ProviderProfile } from '../user-management/domain/entities/provider-profile.entity';
import { User } from '../identity/domain/entities/user.entity';

// Services
import { CategoryService } from './application/services/category.service';
import { ServiceService } from './application/services/service.service';
import { ProviderProfileService } from '../user-management/application/services/provider-profile.service';

// Controllers
import { CategoryController } from './presentation/category.controller';
import { ServiceController } from './presentation/service.controller';
import { DiscoveryController } from './presentation/discovery.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Service,
      ServiceImage,
      Profile,
      ProviderProfile,
      User,
    ]),
  ],
  controllers: [
    CategoryController,
    ServiceController,
    DiscoveryController,
  ],
  providers: [CategoryService, ServiceService, ProviderProfileService],
  exports: [CategoryService, ServiceService],
})
export class ServiceCatalogModule {}
