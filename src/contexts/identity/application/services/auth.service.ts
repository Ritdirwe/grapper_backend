import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { RefreshToken } from '@contexts/identity/domain/entities/refresh-token.entity';
import { VerificationCode } from '@contexts/identity/domain/entities/verification-code.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { PermissionsService } from '@common/authz/application/services/permissions.service';
import { PasswordHasherService } from '@contexts/identity/domain/services/password-hasher.service';
import { EmailService } from '@infrastructure/email/email.service';
import { AuthActivityService } from './auth-activity.service';
import { AuthActivityAction } from '@contexts/identity/domain/value-objects/auth-activity-action.vo';
import {
  RegisterDto,
  RegisterRole,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
  SwitchRoleDto,
} from '../dto/auth.dto';
import {
  AuthResponseDto,
  UserDto,
  TokenPayload,
} from '../dto/auth-response.dto';
import {
  UserRole,
  VerificationType,
} from '@contexts/identity/domain/value-objects/user-role.vo';
import { randomBytes } from 'crypto';

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private passwordHasher: PasswordHasherService,
    private authActivityService: AuthActivityService,
    private permissionsService: PermissionsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto, context?: AuthRequestContext): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.phoneNumber) {
      const existingByPhone = await this.userRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });

      if (existingByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    const registrationRoles = this.resolveRegistrationRoles(dto.role);

    // Hash password
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // Create user
    let user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      phoneNumber: dto.phoneNumber,
      role: registrationRoles.primaryRole,
    });

    try {
      await this.userRepository.save(user);
    } catch (error: any) {
      // Postgres unique violation
      if (error?.code === '23505') {
        const detail: string | undefined = error?.detail;
        if (typeof detail === 'string') {
          if (detail.includes('(email)=(')) {
            throw new ConflictException('User with this email already exists');
          }
          if (detail.includes('(phone_number)=(')) {
            throw new ConflictException('User with this phone number already exists');
          }
        }
        throw new ConflictException('User already exists');
      }
      throw error;
    }

    for (const role of registrationRoles.rolesToAssign) {
      await this.permissionsService.assignRoleToUser(user.id, role);
    }

    await this.permissionsService.setPrimaryRoleForUser(
      user.id,
      registrationRoles.primaryRole,
    );

    const refreshedUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (refreshedUser) {
      user = refreshedUser;
    }

    await this.authActivityService.log({
      action: AuthActivityAction.REGISTER,
      userId: user.id,
      email: user.email,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // Generate email verification code
    await this.generateVerificationCode(
      user.id,
      VerificationType.EMAIL,
      user.email,
    );

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto, context?: AuthRequestContext): Promise<AuthResponseDto> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      await this.authActivityService.log({
        action: AuthActivityAction.LOGIN_FAILED,
        email: dto.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordHasher.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      await this.authActivityService.log({
        action: AuthActivityAction.LOGIN_FAILED,
        userId: user.id,
        email: user.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user can login
    if (!user.canLogin()) {
      if (user.mustResetPassword) {
        await this.authActivityService.log({
          action: AuthActivityAction.LOGIN_FAILED,
          userId: user.id,
          email: user.email,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          metadata: { reason: 'activation_pending' },
        });
        throw new UnauthorizedException('Please activate your account');
      }

      if (!user.emailVerified) {
        await this.authActivityService.log({
          action: AuthActivityAction.LOGIN_FAILED,
          userId: user.id,
          email: user.email,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          metadata: { reason: 'email_not_verified' },
        });
        throw new UnauthorizedException('Please verify your email first');
      }

      await this.authActivityService.log({
        action: AuthActivityAction.LOGIN_FAILED,
        userId: user.id,
        email: user.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'account_not_active' },
      });
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    await this.authActivityService.log({
      action: AuthActivityAction.LOGIN_SUCCESS,
      userId: user.id,
      email: user.email,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  async verifyEmail(
    dto: VerifyEmailDto,
    context?: AuthRequestContext,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      await this.authActivityService.log({
        action: AuthActivityAction.VERIFY_EMAIL_FAILED,
        email: dto.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'user_not_found' },
      });
      throw new BadRequestException('Invalid verification code');
    }

    const code = await this.verificationCodeRepository.findOne({
      where: {
        userId: user.id,
        code: dto.code,
        type: VerificationType.EMAIL,
      },
    });

    if (!code) {
      await this.authActivityService.log({
        action: AuthActivityAction.VERIFY_EMAIL_FAILED,
        userId: user.id,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'code_not_found' },
      });
      throw new BadRequestException('Invalid verification code');
    }

    if (!code.isValid()) {
      await this.authActivityService.log({
        action: AuthActivityAction.VERIFY_EMAIL_FAILED,
        userId: user.id,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'code_expired_or_used' },
      });
      throw new BadRequestException('Verification code has expired or been used');
    }

    // Mark code as used
    code.markAsUsed();
    await this.verificationCodeRepository.save(code);

    // Update user
    await this.userRepository.update(user.id, { emailVerified: true });

    await this.authActivityService.log({
      action: AuthActivityAction.VERIFY_EMAIL,
      userId: user.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(
    dto: ResendVerificationEmailDto,
    context?: AuthRequestContext,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      await this.authActivityService.log({
        action: AuthActivityAction.RESEND_VERIFICATION_EMAIL,
        email: dto.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'user_not_found' },
      });
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      await this.authActivityService.log({
        action: AuthActivityAction.RESEND_VERIFICATION_EMAIL,
        userId: user.id,
        email: user.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'already_verified' },
      });
      return { message: 'Email is already verified' };
    }

    const existingCodes = await this.verificationCodeRepository.find({
      where: {
        userId: user.id,
        type: VerificationType.EMAIL,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingCodes.length > 0) {
      for (const c of existingCodes) {
        c.markAsUsed();
      }
      await this.verificationCodeRepository.save(existingCodes);
    }

    await this.generateVerificationCode(user.id, VerificationType.EMAIL, user.email);

    await this.authActivityService.log({
      action: AuthActivityAction.RESEND_VERIFICATION_EMAIL,
      userId: user.id,
      email: user.email,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    return { message: 'Verification code resent' };
  }

  async refreshTokens(dto: RefreshTokenDto, context?: AuthRequestContext): Promise<AuthResponseDto> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: dto.refreshToken },
      relations: ['user'],
    });

    if (!refreshToken || !refreshToken.isValid()) {
      await this.authActivityService.log({
        action: AuthActivityAction.REFRESH_FAILED,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'invalid_refresh_token' },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    refreshToken.revoke();
    await this.refreshTokenRepository.save(refreshToken);

    // Generate new tokens
    const response = await this.generateAuthResponse(refreshToken.user);

    await this.authActivityService.log({
      action: AuthActivityAction.REFRESH_SUCCESS,
      userId: refreshToken.user.id,
      email: refreshToken.user.email,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return response;
  }

  async requestPasswordReset(
    dto: ResetPasswordDto,
    context?: AuthRequestContext,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      await this.authActivityService.log({
        action: AuthActivityAction.PASSWORD_RESET_REQUEST,
        email: dto.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'user_not_found' },
      });
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset code has been sent' };
    }

    // Generate reset code
    await this.generateVerificationCode(
      user.id,
      VerificationType.PASSWORD_RESET,
      user.email,
    );

    await this.authActivityService.log({
      action: AuthActivityAction.PASSWORD_RESET_REQUEST,
      userId: user.id,
      email: user.email,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'If the email exists, a reset code has been sent' };
  }

  async confirmPasswordReset(
    dto: ConfirmResetPasswordDto,
    context?: AuthRequestContext,
  ): Promise<{ message: string }> {
    const code = await this.verificationCodeRepository.findOne({
      where: {
        userId: dto.userId,
        code: dto.code,
        type: VerificationType.PASSWORD_RESET,
      },
    });

    if (!code || !code.isValid()) {
      await this.authActivityService.log({
        action: AuthActivityAction.PASSWORD_RESET_FAILED,
        userId: dto.userId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { reason: 'invalid_or_expired_code' },
      });
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Hash new password
    const passwordHash = await this.passwordHasher.hash(dto.newPassword);

    // Update user password
    await this.userRepository.update(dto.userId, {
      passwordHash,
      mustResetPassword: false,
      emailVerified: true,
    });

    // Mark code as used
    code.markAsUsed();
    await this.verificationCodeRepository.save(code);

    await this.authActivityService.log({
      action: AuthActivityAction.PASSWORD_RESET_SUCCESS,
      userId: dto.userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  async logout(
    userId: string,
    refreshToken: string,
    context?: AuthRequestContext,
  ): Promise<{ message: string }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, user: { id: userId } },
    });

    if (token) {
      token.revoke();
      await this.refreshTokenRepository.save(token);
    }

    await this.authActivityService.log({
      action: AuthActivityAction.LOGOUT,
      userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'Logged out successfully' };
  }

  async switchRole(userId: string, dto: SwitchRoleDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let assignedRoles = await this.permissionsService.getUserRoles(userId, user.role);

    if (!assignedRoles.includes(dto.switchTo)) {
      if (dto.switchTo === UserRole.ADMIN) {
        throw new UnauthorizedException('Requested role is not assigned to this account');
      }

      await this.permissionsService.assignRoleToUser(userId, dto.switchTo);
      assignedRoles = await this.permissionsService.getUserRoles(userId, user.role);

      if (!assignedRoles.includes(dto.switchTo)) {
        throw new UnauthorizedException('Requested role is not assigned to this account');
      }
    }

    await this.permissionsService.setPrimaryRoleForUser(userId, dto.switchTo);

    const activeRefreshTokens = await this.refreshTokenRepository.find({
      where: { user: { id: userId }, isRevoked: false },
    });

    if (activeRefreshTokens.length > 0) {
      for (const token of activeRefreshTokens) {
        token.revoke();
      }
      await this.refreshTokenRepository.save(activeRefreshTokens);
    }

    await this.userRepository.increment({ id: userId }, 'sessionVersion', 1);

    const refreshedUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!refreshedUser) {
      throw new NotFoundException('User not found');
    }

    return this.generateAuthResponse(refreshedUser);
  }

  // Helper methods
  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sv: user.sessionVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: this.mapUserToDto(user),
    };
  }

  private async createRefreshToken(user: User): Promise<RefreshToken> {
    const token = randomBytes(64).toString('hex');
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const refreshToken = this.refreshTokenRepository.create({
      user,
      token,
      expiresAt,
    });

    // Clean up old tokens (keep only last 5)
    const userTokens = await this.refreshTokenRepository.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });

    if (userTokens.length >= 5) {
      const tokensToDelete = userTokens.slice(4);
      await this.refreshTokenRepository.remove(tokensToDelete);
    }

    return this.refreshTokenRepository.save(refreshToken);
  }

  private async generateVerificationCode(
    userId: string,
    type: VerificationType,
    emailOrPhone: string,
  ): Promise<VerificationCode> {
    const code = VerificationCode.generateCode();
    const expiresAt = VerificationCode.getExpiryDate(15); // 15 minutes

    const verificationCode = this.verificationCodeRepository.create({
      userId,
      type,
      code,
      expiresAt,
      email: type === VerificationType.EMAIL ? emailOrPhone : undefined,
      phoneNumber: type === VerificationType.PHONE ? emailOrPhone : undefined,
    });

    await this.verificationCodeRepository.save(verificationCode);

    // Send email based on type
    if (type === VerificationType.EMAIL) {
      await this.emailService.sendVerificationCode(emailOrPhone, code);
    } else if (type === VerificationType.PASSWORD_RESET) {
      await this.emailService.sendPasswordResetCode(emailOrPhone, code);
    }

    return verificationCode;
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    };
  }

  private resolveRegistrationRoles(role?: RegisterRole): {
    rolesToAssign: UserRole[];
    primaryRole: UserRole;
  } {
    switch (role) {
      case RegisterRole.ADMIN:
        throw new BadRequestException('Admin registration is not allowed');
      case RegisterRole.PROVIDER:
        return {
          rolesToAssign: [UserRole.PROVIDER],
          primaryRole: UserRole.PROVIDER,
        };
      case RegisterRole.BOTH:
        return {
          rolesToAssign: [UserRole.USER, UserRole.PROVIDER],
          primaryRole: UserRole.PROVIDER,
        };
      case RegisterRole.USER:
      default:
        return {
          rolesToAssign: [UserRole.USER],
          primaryRole: UserRole.USER,
        };
    }
  }
}
