import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from '@contexts/billing/payment/payment.module';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { ProviderProfile } from '@contexts/identity/user-management/domain/entities/provider-profile.entity';
import { PayoutMethod } from '@contexts/identity/user-management/domain/entities/payout-method.entity';
import { UserPreferences } from '@contexts/identity/user-management/domain/entities/user-preferences.entity';
import { UserFollow } from '@contexts/identity/user-management/domain/entities/user-follow.entity';
import { UserSearch } from '@contexts/identity/user-management/domain/entities/user-search.entity';
import { VerificationRequest } from '@contexts/identity/user-management/domain/entities/verification-request.entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { ProfileService } from '@contexts/identity/user-management/application/services/profile.service';
import { ProfileReadService } from '@contexts/identity/user-management/application/services/profile-read.service';
import { ProviderProfileService } from '@contexts/identity/user-management/application/services/provider-profile.service';
import { PayoutMethodService } from '@contexts/identity/user-management/application/services/payout-method.service';
import { PreferencesService } from '@contexts/identity/user-management/application/services/preferences.service';
import { FollowService } from '@contexts/identity/user-management/application/services/follow.service';
import { AdminUserService } from '@contexts/identity/user-management/application/services/admin-user.service';
import { UserSearchService } from '@contexts/identity/user-management/application/services/user-search.service';
import { PROFILE_READ_CONTRACT } from '@shared/contracts/profile-read.contract';
import { ProfileController } from '@contexts/identity/user-management/presentation/profile.controller';
import { ProviderProfileController } from '@contexts/identity/user-management/presentation/provider-profile.controller';
import { PayoutMethodController } from '@contexts/identity/user-management/presentation/payout-method.controller';
import { PreferencesController } from '@contexts/identity/user-management/presentation/preferences.controller';
import { FollowController } from '@contexts/identity/user-management/presentation/follow.controller';
import { AdminUserController } from '@contexts/identity/user-management/presentation/admin-user.controller';
import { UserSearchController } from '@contexts/identity/user-management/presentation/user-search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      ProviderProfile,
      PayoutMethod,
      UserPreferences,
      UserFollow,
      UserSearch,
      VerificationRequest,
      User,
    ]),
    PaymentModule,
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
    ProfileReadService,
    {
      provide: PROFILE_READ_CONTRACT,
      useExisting: ProfileReadService,
    },
    ProviderProfileService,
    PayoutMethodService,
    PreferencesService,
    FollowService,
    AdminUserService,
    UserSearchService,
  ],
  exports: [
    ProfileService,
    ProfileReadService,
    PROFILE_READ_CONTRACT,
    ProviderProfileService,
    PayoutMethodService,
    PreferencesService,
    FollowService,
    AdminUserService,
    UserSearchService,
  ],
})
export class UserManagementModule {}
