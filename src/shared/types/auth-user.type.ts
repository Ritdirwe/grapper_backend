export interface AuthUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  roles?: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: Date;
  [key: string]: unknown;
}
