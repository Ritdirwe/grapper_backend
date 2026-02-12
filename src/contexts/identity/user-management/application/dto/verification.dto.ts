import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '../../domain/value-objects/user-enums.vo';

export class SubmitVerificationDto {
  @ApiProperty({ example: 'government_id' })
  @IsString()
  credentialType: string;

  @ApiProperty({
    required: false,
    example: { documentNumber: 'A123456789', issuingCountry: 'US' },
  })
  @IsOptional()
  @IsObject()
  credentialData?: Record<string, any>;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['https://cdn.example.com/kyc/front.jpg', 'https://cdn.example.com/kyc/back.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentUrls?: string[];
}

export class VerificationResponseDto {
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

  @ApiProperty({ required: false })
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

export class AdminReviewVerificationDto {
  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiProperty({ required: false, example: 'Identity and documents confirmed.' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class AdminVerificationListQueryDto {
  @ApiProperty({ required: false, enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}
