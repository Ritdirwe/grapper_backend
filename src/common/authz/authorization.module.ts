import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionDefinitionEntity } from '@common/authz/domain/entities/permission-definition.entity';
import { RolePermissionEntity } from '@common/authz/domain/entities/role-permission.entity';
import { RoleDefinitionEntity } from '@common/authz/domain/entities/role-definition.entity';
import { UserRoleAssignmentEntity } from '@common/authz/domain/entities/user-role-assignment.entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { PermissionsService } from '@common/authz/application/services/permissions.service';
import { PermissionsGuard } from '@common/guards/permissions.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PermissionDefinitionEntity,
      RolePermissionEntity,
      RoleDefinitionEntity,
      UserRoleAssignmentEntity,
      User,
    ]),
  ],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class AuthorizationModule {}
