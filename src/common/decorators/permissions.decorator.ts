import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '@common/authz/permissions.enum';

export const PERMISSIONS_META_KEY = 'permissions';

export const Permissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_META_KEY, permissions);
