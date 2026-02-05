import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateUserSearchDto {
  @ApiProperty({ description: 'Search query text' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'Search type', default: 'general', required: false })
  @IsString()
  @IsOptional()
  searchType?: string;

  @ApiProperty({ description: 'Number of results returned', required: false })
  @IsNumber()
  @IsOptional()
  resultCount?: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UserSearchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  query: string;

  @ApiProperty()
  searchType: string;

  @ApiProperty({ nullable: true })
  resultCount?: number;

  @ApiProperty()
  createdAt: Date;
}

export class UserSearchQueryDto {
  @ApiProperty({ description: 'Limit results', required: false, default: 10 })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: 'Search type filter', required: false })
  @IsString()
  @IsOptional()
  searchType?: string;
}
