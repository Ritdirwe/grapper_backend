import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUrl,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Graphics & Design' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'graphics-design' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Logo design, web design, and more', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/icons/design.png', required: false })
  @IsUrl()
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({ example: 'https://example.com/images/design.jpg', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'parent-category-uuid', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Graphics & Design', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'graphics-design', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Logo design, web design, and more', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/icons/design.png', required: false })
  @IsUrl()
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({ example: 'https://example.com/images/design.jpg', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  iconUrl?: string;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  serviceCount: number;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ type: [CategoryResponseDto], required: false })
  children?: CategoryResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
