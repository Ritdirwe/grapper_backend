import { Module } from '@nestjs/common';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { BookingModule } from './booking/booking.module';
import { ContractsModule } from './contracts/contracts.module';
import { ReviewsModule } from './reviews/reviews.module';
import { GigsModule } from './gigs/gigs.module';

@Module({
  imports: [ServiceCatalogModule, BookingModule, ContractsModule, ReviewsModule, GigsModule],
  exports: [ServiceCatalogModule, BookingModule, ContractsModule, ReviewsModule, GigsModule],
})
export class MarketplaceModule {}
