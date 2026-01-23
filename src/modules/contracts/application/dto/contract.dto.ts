
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContractStatus } from '../../domain/entities/contract.entity';
import { MilestoneStatus } from '../../domain/entities/milestone.entity';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  dueDate: Date;
}

export class CreateContractDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  providerId: string;

  @IsNumber()
  totalAmount: number;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsString()
  @IsOptional()
  paymentTerms: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  @IsOptional()
  milestones?: CreateMilestoneDto[];
}

export class UpdateContractDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;
}

export class UpdateMilestoneDto {
  @IsEnum(MilestoneStatus)
  status: MilestoneStatus;
}
