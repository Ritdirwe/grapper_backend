import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../application/services/auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
} from '../application/dto/auth.dto';
import { AuthResponseDto, UserDto } from '../application/dto/auth-response.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP code' })
  @ApiResponse({ status: 200, description: 'Verification code resent' })
  async resendVerificationEmail(
    @Body() dto: ResendVerificationEmailDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access tokens using refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link/code' })
  @ApiResponse({ status: 200, description: 'Reset code sent if email exists' })
  async forgotPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP code' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(
    @Body() dto: ConfirmResetPasswordDto,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.authService.confirmPasswordReset(dto, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Body('refreshToken') refreshToken: string,
    @Ip() ip: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.id, refreshToken, {
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserDto })
  async getProfile(@CurrentUser() user: AuthUser) {
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
