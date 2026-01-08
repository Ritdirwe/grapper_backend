import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/identity/domain/value-objects/user-role.vo';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
