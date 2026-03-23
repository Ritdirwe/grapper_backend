import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { UserRole } from '@contexts/identity/domain/value-objects/user-role.vo';
import { PermissionsService } from '@common/authz/application/services/permissions.service';
import {
  RolePermissionBulkUpdateDto,
  SetRolePermissionDto,
} from '../application/dto/admin-permissions.dto';
import { PermissionKey } from '@common/authz/permissions.enum';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Admin Permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('roles')
  @Permissions(PERMISSIONS.OPS_PERMISSION_MATRIX_READ)
  @ApiOperation({ summary: 'List all available roles' })
  @ApiResponse({ status: 200 })
  async getRoles() {
    return this.permissionsService.getRoles();
  }

  @Get('matrix')
  @Permissions(PERMISSIONS.OPS_PERMISSION_MATRIX_READ)
  @ApiOperation({ summary: 'Get role-permission matrix grouped by domain' })
  @ApiResponse({ status: 200 })
  async getPermissionMatrix() {
    return this.permissionsService.getPermissionMatrix();
  }

  @Get('roles/:role')
  @Permissions(PERMISSIONS.OPS_PERMISSION_MATRIX_READ)
  @ApiOperation({ summary: 'Get permissions for a role' })
  @ApiResponse({ status: 200 })
  async getRolePermissions(@Param('role') role: UserRole) {
    return this.permissionsService.getRolePermissions(role);
  }

  @Put('roles/:role/:permissionKey')
  @Permissions(PERMISSIONS.OPS_PERMISSION_MATRIX_WRITE)
  @ApiOperation({ summary: 'Set single permission for a role' })
  @ApiResponse({ status: 200 })
  async setRolePermission(
    @Param('role') role: UserRole,
    @Param('permissionKey') permissionKey: PermissionKey,
    @Body() dto: SetRolePermissionDto,
  ) {
    return this.permissionsService.setRolePermission(role, permissionKey, dto.enabled);
  }

  @Put('roles/:role')
  @Permissions(PERMISSIONS.OPS_PERMISSION_MATRIX_WRITE)
  @ApiOperation({ summary: 'Bulk set permissions for a role' })
  @ApiResponse({ status: 200 })
  async bulkSetRolePermissions(
    @Param('role') role: UserRole,
    @Body() dto: RolePermissionBulkUpdateDto,
  ) {
    return this.permissionsService.bulkSetRolePermissions(role, dto.permissions);
  }
}
