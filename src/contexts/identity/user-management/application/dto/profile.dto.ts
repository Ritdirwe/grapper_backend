import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsDateString,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '../../domain/value-objects/user-enums.vo';
import { VerificationResponseDto } from './verification.dto';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 'JohnD', required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ example: 'I am a software engineer', required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg', required: false })
  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ example: 'New York', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'USA', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'New York City', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: 'University of Lagos', required: false })
  @IsString()
  @IsOptional()
  university?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
}

export class ProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false })
  fullName?: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  bio?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty({ required: false })
  coverImageUrl?: string;

  @ApiProperty({ required: false })
  birthdate?: Date;

  @ApiProperty({ enum: Gender, required: false })
  gender?: Gender;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  website?: string;

  @ApiProperty({ required: false })
  university?: string;

  @ApiProperty({ required: false })
  preferredSavedPaymentMethodId?: string;

  @ApiProperty({ required: false })
  socialLinks?: Record<string, string>;

  @ApiProperty()
  verificationStatus: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  strikeCount: number;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false, type: VerificationResponseDto })
  latestVerification?: VerificationResponseDto;

  @ApiProperty({ required: false, type: [VerificationResponseDto] })
  verificationHistory?: VerificationResponseDto[];
}
