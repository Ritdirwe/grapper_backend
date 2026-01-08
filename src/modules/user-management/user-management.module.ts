import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Profile } from './domain/entities/profile.entity';
import { ProviderProfile } from './domain/entities/provider-profile.entity';
import { PayoutMethod } from './domain/entities/payout-method.entity';
import { UserPreferences } from './domain/entities/user-preferences.entity';
import { User } from '../identity/domain/entities/user.entity';

// Services
import { ProfileService } from './application/services/profile.service';
import { AdminUserService } from './application/services/admin-user.service';

// Controllers
import { ProfileController } from './presentation/profile.controller';
import { AdminUserController } from './presentation/admin-user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      ProviderProfile,
      PayoutMethod,
      UserPreferences,
      User,
    ]),
  ],
  controllers: [ProfileController, AdminUserController],
  providers: [ProfileService, AdminUserService],
  exports: [ProfileService, AdminUserService],
})
export class UserManagementModule {}
