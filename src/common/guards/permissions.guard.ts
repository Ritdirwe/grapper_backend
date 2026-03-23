import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '@shared/types/auth-user.type';
import { PermissionsService } from '@common/authz/application/services/permissions.service';
import { PERMISSIONS_META_KEY } from '@common/decorators/permissions.decorator';
import { PermissionKey } from '@common/authz/permissions.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_META_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user || !user.id) {
      throw new ForbiddenException('Missing authenticated role context');
    }

    const effectiveRoles = await this.permissionsService.getUserRoles(
      user.id,
      user.role,
    );
    if (effectiveRoles.length === 0) {
      throw new ForbiddenException('No roles assigned to authenticated user');
    }

    request.user = {
      ...user,
      roles: effectiveRoles,
      role: user.role ?? effectiveRoles[0],
    };

    for (const permission of requiredPermissions) {
      const allowed = await this.permissionsService.hasPermission(effectiveRoles, permission);
      if (!allowed) {
        throw new ForbiddenException(`Missing permission: ${permission}`);
      }
    }

    return true;
  }
}
