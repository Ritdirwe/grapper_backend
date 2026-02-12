import { SetMetadata } from '@nestjs/common';
import { Role, RoleValue } from '@shared/types/role.type';

export const Roles = (...roles: Array<Role | RoleValue | string>) =>
  SetMetadata('roles', roles);
