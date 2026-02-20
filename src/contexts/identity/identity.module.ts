import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './domain/entities/user.entity';
import { RefreshToken } from './domain/entities/refresh-token.entity';
import { VerificationCode } from './domain/entities/verification-code.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { AuthActivity } from './domain/entities/auth-activity.entity';
import { AuthService } from './application/services/auth.service';
import { AuthActivityService } from './application/services/auth-activity.service';
import { PasswordHasherService } from './domain/services/password-hasher.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, VerificationCode, Profile, AuthActivity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: (configService.get<string>('jwt.expiresIn') || '7d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthActivityService, PasswordHasherService, JwtStrategy],
  exports: [AuthService, AuthActivityService, PasswordHasherService],
})
export class IdentityModule {}
