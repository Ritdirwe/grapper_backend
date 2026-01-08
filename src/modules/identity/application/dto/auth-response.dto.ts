import { UserRole } from '../../domain/value-objects/user-role.vo';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export class UserDto {
  id: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
}

export class TokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
