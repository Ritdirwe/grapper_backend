import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PushTokenPlatform } from '../../domain/value-objects/push-token-platform.vo';

export class RegisterTokenDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push token for React Native apps or FCM token for web push',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'expo', enum: PushTokenPlatform, default: PushTokenPlatform.EXPO })
  @IsEnum(PushTokenPlatform)
  @IsOptional()
  platform?: PushTokenPlatform;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class BroadcastDto {
  @ApiProperty({ example: 'System Update' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'We have updated our terms of service.' })
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  data?: Record<string, any>;
}
