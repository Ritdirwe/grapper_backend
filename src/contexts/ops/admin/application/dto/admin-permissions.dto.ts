import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PERMISSIONS, PermissionKey } from '@common/authz/permissions.enum';

export class SetRolePermissionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

export class RolePermissionBulkItemDto {
  @ApiProperty({ example: 'marketplace.service.create.own' })
  @IsIn(Object.values(PERMISSIONS))
  permissionKey: PermissionKey;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

export class RolePermissionBulkUpdateDto {
  @ApiProperty({ type: [RolePermissionBulkItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionBulkItemDto)
  permissions: RolePermissionBulkItemDto[];
}
