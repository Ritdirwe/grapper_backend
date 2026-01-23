
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GigStatus } from '../../domain/entities/gig.entity';

export class CreateGigDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  deliveryTime?: number;
}

export class UpdateGigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(GigStatus)
  status?: GigStatus;
}

export class CreateProposalDto {
  @ApiProperty()
  @IsString()
  coverLetter: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  proposedPrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  deliveryTime: number;
}
