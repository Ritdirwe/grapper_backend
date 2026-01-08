import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsDateString,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Gender } from '../../domain/value-objects/user-enums.vo';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

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
  id: string;
  userId: string;
  fullName?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  birthdate?: Date;
  gender?: Gender;
  location?: string;
  country?: string;
  city?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  verificationStatus: string;
  isVerified: boolean;
  strikeCount: number;
  isFeatured: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}
