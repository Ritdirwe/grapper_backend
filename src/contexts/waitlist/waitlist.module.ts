import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { ProviderProfile } from '@contexts/identity/user-management/domain/entities/provider-profile.entity';
import { IdentityContextModule } from '@contexts/identity/identity-context.module';
import { WaitlistService } from './application/services/waitlist.service';
import { WaitlistPromotionService } from './application/services/waitlist-promotion.service';
import { WaitlistController } from './presentation/waitlist.controller';
import { WaitlistDatabaseService } from './infrastructure/waitlist-database.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, ProviderProfile]),
    IdentityContextModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistDatabaseService, WaitlistService, WaitlistPromotionService],
  exports: [WaitlistDatabaseService, WaitlistService, WaitlistPromotionService],
})
export class WaitlistModule {}
