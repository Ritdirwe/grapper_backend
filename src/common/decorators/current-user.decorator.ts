import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@shared/types/auth-user.type';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    return data ? user?.[data] : user;
  },
);
