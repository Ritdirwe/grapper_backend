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
import { PasswordHasherService } from '@contexts/identity/domain/services/password-hasher.service';
import { EmailService } from '@infrastructure/email/email.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
} from '../dto/auth.dto';
import {
  AuthResponseDto,
  UserDto,
  TokenPayload,
} from '../dto/auth-response.dto';
import { VerificationType } from '@contexts/identity/domain/value-objects/user-role.vo';
import { randomBytes } from 'crypto';

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
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
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

    // Hash password
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      phoneNumber: dto.phoneNumber,
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

    // Generate email verification code
    await this.generateVerificationCode(
      user.id,
      VerificationType.EMAIL,
      user.email,
    );

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordHasher.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user can login
    if (!user.canLogin()) {
      if (!user.emailVerified) {
        throw new UnauthorizedException('Please verify your email first');
      }
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const code = await this.verificationCodeRepository.findOne({
      where: {
        userId: dto.userId,
        code: dto.code,
        type: VerificationType.EMAIL,
      },
    });

    if (!code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!code.isValid()) {
      throw new BadRequestException('Verification code has expired or been used');
    }

    // Mark code as used
    code.markAsUsed();
    await this.verificationCodeRepository.save(code);

    // Update user
    await this.userRepository.update(dto.userId, { emailVerified: true });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(
    dto: ResendVerificationEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
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
    return { message: 'Verification code resent' };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: dto.refreshToken },
      relations: ['user'],
    });

    if (!refreshToken || !refreshToken.isValid()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    refreshToken.revoke();
    await this.refreshTokenRepository.save(refreshToken);

    // Generate new tokens
    return this.generateAuthResponse(refreshToken.user);
  }

  async requestPasswordReset(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset code has been sent' };
    }

    // Generate reset code
    await this.generateVerificationCode(
      user.id,
      VerificationType.PASSWORD_RESET,
      user.email,
    );

    return { message: 'If the email exists, a reset code has been sent' };
  }

  async confirmPasswordReset(
    dto: ConfirmResetPasswordDto,
  ): Promise<{ message: string }> {
    const code = await this.verificationCodeRepository.findOne({
      where: {
        userId: dto.userId,
        code: dto.code,
        type: VerificationType.PASSWORD_RESET,
      },
    });

    if (!code || !code.isValid()) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Hash new password
    const passwordHash = await this.passwordHasher.hash(dto.newPassword);

    // Update user password
    await this.userRepository.update(dto.userId, { passwordHash });

    // Mark code as used
    code.markAsUsed();
    await this.verificationCodeRepository.save(code);

    return { message: 'Password reset successfully' };
  }

  async logout(userId: string, refreshToken: string): Promise<{ message: string }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, user: { id: userId } },
    });

    if (token) {
      token.revoke();
      await this.refreshTokenRepository.save(token);
    }

    return { message: 'Logged out successfully' };
  }

  // Helper methods
  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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
}
