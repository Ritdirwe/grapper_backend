import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../domain/value-objects/user-role.vo';
import { VerificationStatus } from '../../domain/value-objects/user-enums.vo';

export class AdminUpdateUserDto {
  @ApiProperty({ enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

export class AdminUpdateProfileDto {
  @ApiProperty({ enum: VerificationStatus, required: false })
  @IsEnum(VerificationStatus)
  @IsOptional()
  verificationStatus?: VerificationStatus;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  strikeCount?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  isFeatured?: boolean;
}

export class AdminUserListQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ enum: VerificationStatus, required: false })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class AdminUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiProperty({ required: false })
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  profile?: {
    fullName?: string;
    displayName?: string;
    verificationStatus: VerificationStatus;
    strikeCount: number;
    isFeatured: boolean;
  };
}

export class AdminVerificationListQueryDto {
  @ApiProperty({ enum: VerificationStatus, required: false })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class AdminReviewVerificationDto {
  @ApiProperty({ enum: VerificationStatus })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class AdminVerificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  profileId: string;

  @ApiProperty({ enum: VerificationStatus })
  status: VerificationStatus;

  @ApiProperty()
  credentialType: string;

  @ApiProperty({ required: false, type: Object })
  credentialData?: Record<string, any>;

  @ApiProperty({ required: false, type: [String] })
  documentUrls?: string[];

  @ApiProperty()
  submittedAt: Date;

  @ApiProperty({ required: false })
  reviewedAt?: Date;

  @ApiProperty({ required: false })
  reviewedBy?: string;

  @ApiProperty({ required: false })
  reviewNote?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
