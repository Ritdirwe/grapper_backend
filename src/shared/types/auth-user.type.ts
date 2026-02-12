export interface AuthUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: Date;
  [key: string]: unknown;
}
