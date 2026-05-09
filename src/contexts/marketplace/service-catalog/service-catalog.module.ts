import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserManagementModule } from '@contexts/identity/user-management.module';
import { Category } from './domain/entities/category.entity';
import { Service } from './domain/entities/service.entity';
import { ServiceImage } from './domain/entities/service-image.entity';
import { Booking } from '@contexts/marketplace/booking/domain/entities/booking.entity';
import { CategoryService } from './application/services/category.service';
import { ServiceService } from './application/services/service.service';
import { CategoryController } from './presentation/category.controller';
import { ServiceController } from './presentation/service.controller';
import { DiscoveryController } from './presentation/discovery.controller';
import { SocialModule } from '@contexts/community/social/social.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Service, ServiceImage, Booking]),
    UserManagementModule,
    SocialModule,
  ],
  controllers: [CategoryController, ServiceController, DiscoveryController],
  providers: [CategoryService, ServiceService],
  exports: [CategoryService, ServiceService],
})
export class ServiceCatalogModule {}
