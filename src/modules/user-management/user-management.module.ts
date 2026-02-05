import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from '../payment/payment.module';

// Entities
import { Profile } from './domain/entities/profile.entity';
import { ProviderProfile } from './domain/entities/provider-profile.entity';
import { PayoutMethod } from './domain/entities/payout-method.entity';
import { UserPreferences } from './domain/entities/user-preferences.entity';
import { UserFollow } from './domain/entities/user-follow.entity';
import { UserSearch } from './domain/entities/user-search.entity';
import { User } from '../identity/domain/entities/user.entity';

// Services
import { ProfileService } from './application/services/profile.service';
import { ProviderProfileService } from './application/services/provider-profile.service';
import { PayoutMethodService } from './application/services/payout-method.service';
import { PreferencesService } from './application/services/preferences.service';
import { FollowService } from './application/services/follow.service';
import { AdminUserService } from './application/services/admin-user.service';
import { UserSearchService } from './application/services/user-search.service';

// Controllers
import { ProfileController } from './presentation/profile.controller';
import { ProviderProfileController } from './presentation/provider-profile.controller';
import { PayoutMethodController } from './presentation/payout-method.controller';
import { PreferencesController } from './presentation/preferences.controller';
import { FollowController } from './presentation/follow.controller';
import { AdminUserController } from './presentation/admin-user.controller';
import { UserSearchController } from './presentation/user-search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      ProviderProfile,
      PayoutMethod,
      UserPreferences,
      UserFollow,
      UserSearch,
      User,
    ]),
    forwardRef(() => PaymentModule),
  ],
  controllers: [
    ProfileController,
    ProviderProfileController,
    PayoutMethodController,
    PreferencesController,
    FollowController,
    AdminUserController,
    UserSearchController,
  ],
  providers: [
    ProfileService,
    ProviderProfileService,
    PayoutMethodService,
    PreferencesService,
    FollowService,
    AdminUserService,
    UserSearchService,
  ],
  exports: [
    ProfileService,
    ProviderProfileService,
    PayoutMethodService,
    PreferencesService,
    FollowService,
    AdminUserService,
    UserSearchService,
  ],
})
export class UserManagementModule {}
