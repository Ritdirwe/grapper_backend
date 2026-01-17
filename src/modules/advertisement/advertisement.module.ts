import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Advertisement } from './domain/entities/advertisement.entity';
import { AdImpression } from './domain/entities/ad-impression.entity';
import { AdClick } from './domain/entities/ad-click.entity';

// Services
import { AdService } from './application/services/ad.service';

// Controllers
import { AdController } from './presentation/ad.controller';
import { AdPublicController } from './presentation/ad-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Advertisement, AdImpression, AdClick]),
  ],
  controllers: [AdController, AdPublicController],
  providers: [AdService],
  exports: [AdService],
})
export class AdvertisementModule {}
