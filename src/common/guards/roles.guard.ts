import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '@shared/types/auth-user.type';
import { PermissionsService } from '@common/authz/application/services/permissions.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user?.id) {
      return false;
    }

    const effectiveRoles = await this.permissionsService.getUserRoles(user.id, user.role);
    const roleSet = new Set(effectiveRoles);
    return requiredRoles.some((role) => roleSet.has(role as any));
  }
}
