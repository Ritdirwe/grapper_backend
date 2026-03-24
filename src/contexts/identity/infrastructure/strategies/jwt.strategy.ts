import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { TokenPayload } from '@contexts/identity/application/dto/auth-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.secret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: TokenPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive()) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokenSessionVersion = typeof payload.sv === 'number' ? payload.sv : 1;
    if (tokenSessionVersion !== user.sessionVersion) {
      throw new UnauthorizedException('Session has been invalidated');
    }

    return user;
  }
}
