import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntry } from './domain/entities/waitlist-entry.entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { ProviderProfile } from '@contexts/identity/user-management/domain/entities/provider-profile.entity';
import { IdentityContextModule } from '@contexts/identity/identity-context.module';
import { WaitlistService } from './application/services/waitlist.service';
import { WaitlistPromotionService } from './application/services/waitlist-promotion.service';
import { WaitlistController } from './presentation/waitlist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry], 'waitlist'),
    TypeOrmModule.forFeature([User, Profile, ProviderProfile]),
    IdentityContextModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistPromotionService],
  exports: [WaitlistService, WaitlistPromotionService],
})
export class WaitlistModule {}
