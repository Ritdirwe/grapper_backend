import { Module } from '@nestjs/common';
import { IdentityModule } from './identity.module';
import { UserManagementModule } from './user-management.module';

@Module({
  imports: [IdentityModule, UserManagementModule],
  exports: [IdentityModule, UserManagementModule],
})
export class IdentityContextModule {}
