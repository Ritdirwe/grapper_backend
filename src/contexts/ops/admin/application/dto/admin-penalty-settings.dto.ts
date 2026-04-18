import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProviderRejectionPenaltyMode } from '../../domain/entities/admin-penalty-setting.entity';

export class UpdateAdminPenaltySettingsDto {
  @ApiProperty({ required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  customerCorrectionEnabled?: boolean;

  @ApiProperty({ required: false, example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  customerCorrectionFreeLimit?: number;

  @ApiProperty({ required: false, example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  customerCorrectionFlatPenalty?: number;

  @ApiProperty({ required: false, example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  customerCorrectionPercentPenalty?: number;

  @ApiProperty({ required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  providerEvidenceEnabled?: boolean;

  @ApiProperty({ required: false, example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  providerEvidenceFreeLimit?: number;

  @ApiProperty({ required: false, example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  providerEvidenceFlatPenalty?: number;

  @ApiProperty({ required: false, example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  providerEvidencePercentPenalty?: number;

  @ApiProperty({ required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  providerRejectionEnabled?: boolean;

  @ApiProperty({ required: false, example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  providerRejectionFlatPenalty?: number;

  @ApiProperty({ required: false, example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  providerRejectionPercentPenalty?: number;

  @ApiProperty({ required: false, enum: ProviderRejectionPenaltyMode })
  @IsEnum(ProviderRejectionPenaltyMode)
  @IsOptional()
  providerRejectionPenaltyMode?: ProviderRejectionPenaltyMode;
}

export class AdminPenaltySettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerCorrectionEnabled: boolean;

  @ApiProperty()
  customerCorrectionFreeLimit: number;

  @ApiProperty()
  customerCorrectionFlatPenalty: number;

  @ApiProperty()
  customerCorrectionPercentPenalty: number;

  @ApiProperty()
  providerEvidenceEnabled: boolean;

  @ApiProperty()
  providerEvidenceFreeLimit: number;

  @ApiProperty()
  providerEvidenceFlatPenalty: number;

  @ApiProperty()
  providerEvidencePercentPenalty: number;

  @ApiProperty()
  providerRejectionEnabled: boolean;

  @ApiProperty()
  providerRejectionFlatPenalty: number;

  @ApiProperty()
  providerRejectionPercentPenalty: number;

  @ApiProperty({ enum: ProviderRejectionPenaltyMode })
  providerRejectionPenaltyMode: ProviderRejectionPenaltyMode;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
