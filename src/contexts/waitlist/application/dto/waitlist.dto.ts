import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Gender } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';

export enum WaitlistRole {
  USER = 'user',
  PROVIDER = 'provider',
}

export class WaitlistRegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ enum: WaitlistRole })
  @IsEnum(WaitlistRole)
  role: WaitlistRole;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  university?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  skills?: string[];

  @ApiProperty({ required: false, type: [Object] })
  @IsArray()
  @IsOptional()
  certifications?: Array<Record<string, any>>;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearsOfExperience?: number;

  @ApiProperty({ required: false, type: [Object] })
  @IsArray()
  @IsOptional()
  portfolio?: Array<Record<string, any>>;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  responseTimeHours?: number;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  availabilityHours?: Record<string, Record<string, string>>;
}

export class WaitlistRegisterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: WaitlistRole })
  role: WaitlistRole;

  @ApiProperty()
  isPromoted: boolean;

  @ApiProperty()
  createdAt: Date;
}
