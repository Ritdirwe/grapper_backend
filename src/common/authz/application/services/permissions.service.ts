import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { UserRole, UserStatus } from '@contexts/identity/domain/value-objects/user-role.vo';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { PermissionDefinitionEntity } from '@common/authz/domain/entities/permission-definition.entity';
import { RolePermissionEntity } from '@common/authz/domain/entities/role-permission.entity';
import { RoleDefinitionEntity } from '@common/authz/domain/entities/role-definition.entity';
import { UserRoleAssignmentEntity } from '@common/authz/domain/entities/user-role-assignment.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '@common/authz/role-permissions.defaults';
import {
  PermissionKey,
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
} from '@common/authz/permissions.enum';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private roleCache = new Map<UserRole, Set<string>>();
  private userRolesCache = new Map<string, UserRole[]>();

  constructor(
    @InjectRepository(PermissionDefinitionEntity)
    private readonly permissionDefinitionRepository: Repository<PermissionDefinitionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefinitionRepository: Repository<RoleDefinitionEntity>,
    @InjectRepository(UserRoleAssignmentEntity)
    private readonly userRoleAssignmentRepository: Repository<UserRoleAssignmentEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedRoleDefinitions();
    await this.seedUserRoleAssignments();
    await this.seedPermissions();
    await this.seedRolePermissions();
    this.roleCache.clear();
    this.userRolesCache.clear();
  }

  async hasPermission(
    roleOrRoles: UserRole | string | Array<UserRole | string> | undefined,
    permission: PermissionKey,
  ): Promise<boolean> {
    if (!roleOrRoles) return false;
    if (!this.isKnownPermission(permission)) return false;

    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    const supportedRoles = roles.filter((role): role is UserRole => this.isSupportedRole(role));
    if (supportedRoles.length === 0) return false;
    if (supportedRoles.includes(UserRole.ADMIN)) return true;

    for (const role of supportedRoles) {
      const permissions = await this.getRolePermissionSet(role);
      if (permissions.has(permission)) return true;
    }

    return false;
  }

  async getRoles(): Promise<RoleDefinitionEntity[]> {
    return this.roleDefinitionRepository.find({
      order: { roleKey: 'ASC' },
    });
  }

  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignmentEntity[]> {
    return this.userRoleAssignmentRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', roleKey: 'ASC' },
    });
  }

  async getUserRoles(userId: string, fallbackRole?: string): Promise<UserRole[]> {
    const cached = this.userRolesCache.get(userId);
    if (cached) return cached;

    const assignments = await this.getUserRoleAssignments(userId);
    const roleSet = new Set<UserRole>();

    for (const assignment of assignments) {
      if (this.isSupportedRole(assignment.roleKey)) {
        roleSet.add(assignment.roleKey);
      }
    }

    if (roleSet.size === 0 && fallbackRole && this.isSupportedRole(fallbackRole)) {
      roleSet.add(fallbackRole);
    }

    const roles = Array.from(roleSet);
    this.userRolesCache.set(userId, roles);
    return roles;
  }

  async assignRoleToUser(
    userId: string,
    role: UserRole,
    assignedBy?: string,
  ): Promise<UserRoleAssignmentEntity[]> {
    if (!this.isSupportedRole(role)) {
      throw new BadRequestException(`Unsupported role: ${role}`);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existing = await this.userRoleAssignmentRepository.findOne({
      where: { userId, roleKey: role },
    });

    if (!existing) {
      const currentRoles = await this.getUserRoleAssignments(userId);
      const assignment = this.userRoleAssignmentRepository.create({
        userId,
        roleKey: role,
        isPrimary: currentRoles.length === 0,
        assignedBy,
      });
      await this.userRoleAssignmentRepository.save(assignment);
    }

    await this.syncPrimaryRoleToUser(userId);
    this.userRolesCache.delete(userId);
    return this.getUserRoleAssignments(userId);
  }

  async removeRoleFromUser(userId: string, role: UserRole): Promise<UserRoleAssignmentEntity[]> {
    if (!this.isSupportedRole(role)) {
      throw new BadRequestException(`Unsupported role: ${role}`);
    }

    const assignments = await this.getUserRoleAssignments(userId);
    const target = assignments.find((assignment) => assignment.roleKey === role);
    if (!target) {
      return assignments;
    }

    if (role === UserRole.ADMIN) {
      await this.assertNotRemovingLastAdmin(userId);
    }

    if (assignments.length <= 1) {
      throw new BadRequestException('User must have at least one role assignment');
    }

    await this.userRoleAssignmentRepository.remove(target);

    if (target.isPrimary) {
      const remaining = await this.getUserRoleAssignments(userId);
      const nextPrimary = remaining[0];
      if (nextPrimary) {
        nextPrimary.isPrimary = true;
        await this.userRoleAssignmentRepository.save(nextPrimary);
      }
    }

    await this.syncPrimaryRoleToUser(userId);
    this.userRolesCache.delete(userId);
    return this.getUserRoleAssignments(userId);
  }

  async setPrimaryRoleForUser(userId: string, role: UserRole): Promise<UserRoleAssignmentEntity[]> {
    if (!this.isSupportedRole(role)) {
      throw new BadRequestException(`Unsupported role: ${role}`);
    }

    const assignments = await this.getUserRoleAssignments(userId);
    if (assignments.length === 0) {
      throw new BadRequestException('No role assignments found for user');
    }

    const target = assignments.find((assignment) => assignment.roleKey === role);
    if (!target) {
      throw new BadRequestException(`Role ${role} is not assigned to this user`);
    }

    for (const assignment of assignments) {
      assignment.isPrimary = assignment.id === target.id;
    }

    await this.userRoleAssignmentRepository.save(assignments);
    await this.syncPrimaryRoleToUser(userId);
    this.userRolesCache.delete(userId);
    return this.getUserRoleAssignments(userId);
  }

  async getRolePermissions(role: UserRole): Promise<RolePermissionEntity[]> {
    if (role === UserRole.ADMIN) {
      return PERMISSION_DEFINITIONS.map((permission) => {
        const entity = new RolePermissionEntity();
        entity.role = UserRole.ADMIN;
        entity.permissionKey = permission.key;
        entity.enabled = true;
        return entity;
      });
    }

    return this.rolePermissionRepository.find({
      where: { role },
      order: { permissionKey: 'ASC' },
    });
  }

  async getPermissionMatrix(): Promise<Array<{ key: PermissionKey; label: string; domain: string; description: string; roles: Record<UserRole, boolean> }>> {
    const definitions = await this.permissionDefinitionRepository.find({
      order: { domain: 'ASC', permissionKey: 'ASC' },
    });

    const rolePermissions = await this.rolePermissionRepository.find();
    const index = new Map<string, boolean>();
    for (const entry of rolePermissions) {
      index.set(`${entry.role}:${entry.permissionKey}`, entry.enabled);
    }

    return definitions.map((definition) => ({
      key: definition.permissionKey as PermissionKey,
      label: definition.label,
      domain: definition.domain,
      description: definition.description,
      roles: {
        [UserRole.USER]: index.get(`${UserRole.USER}:${definition.permissionKey}`) ?? false,
        [UserRole.PROVIDER]: index.get(`${UserRole.PROVIDER}:${definition.permissionKey}`) ?? false,
        [UserRole.ADMIN]: true,
      },
    }));
  }

  async setRolePermission(role: UserRole, permissionKey: PermissionKey, enabled: boolean): Promise<RolePermissionEntity> {
    if (!this.isSupportedRole(role)) {
      throw new BadRequestException(`Unsupported role: ${role}`);
    }

    if (!this.isKnownPermission(permissionKey)) {
      throw new BadRequestException(`Unknown permission key: ${permissionKey}`);
    }

    if (role === UserRole.ADMIN) {
      const entity = new RolePermissionEntity();
      entity.role = UserRole.ADMIN;
      entity.permissionKey = permissionKey;
      entity.enabled = true;
      return entity;
    }

    let rolePermission = await this.rolePermissionRepository.findOne({
      where: { role, permissionKey },
    });

    if (!rolePermission) {
      rolePermission = this.rolePermissionRepository.create({
        role,
        permissionKey,
        enabled,
      });
    } else {
      rolePermission.enabled = enabled;
    }

    const saved = await this.rolePermissionRepository.save(rolePermission);
    this.roleCache.delete(role);
    return saved;
  }

  async bulkSetRolePermissions(
    role: UserRole,
    permissions: Array<{ permissionKey: PermissionKey; enabled: boolean }>,
  ): Promise<RolePermissionEntity[]> {
    const updates = await Promise.all(
      permissions.map((permission) =>
        this.setRolePermission(role, permission.permissionKey, permission.enabled),
      ),
    );
    return updates;
  }

  private async getRolePermissionSet(role: UserRole): Promise<Set<string>> {
    const cached = this.roleCache.get(role);
    if (cached) return cached;

    const rows = await this.rolePermissionRepository.find({
      where: { role, enabled: true },
    });
    const permissions = new Set(rows.map((entry) => entry.permissionKey));
    this.roleCache.set(role, permissions);
    return permissions;
  }

  private async seedPermissions(): Promise<void> {
    const knownPermissionKeys = PERMISSION_DEFINITIONS.map((definition) => definition.key);

    const staleDefinitions = await this.permissionDefinitionRepository.find({
      where: { permissionKey: Not(In(knownPermissionKeys)) },
    });

    if (staleDefinitions.length > 0) {
      await this.permissionDefinitionRepository.remove(staleDefinitions);
    }

    const staleRolePermissions = await this.rolePermissionRepository.find({
      where: { permissionKey: Not(In(knownPermissionKeys)) },
    });

    if (staleRolePermissions.length > 0) {
      await this.rolePermissionRepository.remove(staleRolePermissions);
    }

    for (const definition of PERMISSION_DEFINITIONS) {
      const existing = await this.permissionDefinitionRepository.findOne({
        where: { permissionKey: definition.key },
      });

      if (!existing) {
        await this.permissionDefinitionRepository.save(
          this.permissionDefinitionRepository.create({
            permissionKey: definition.key,
            label: definition.label,
            domain: definition.domain,
            description: definition.description,
          }),
        );
        continue;
      }

      existing.label = definition.label;
      existing.domain = definition.domain;
      existing.description = definition.description;
      await this.permissionDefinitionRepository.save(existing);
    }
  }

  private async seedRoleDefinitions(): Promise<void> {
    const defaults: Array<{ roleKey: UserRole; label: string; description: string }> = [
      { roleKey: UserRole.USER, label: 'User', description: 'Consumer role' },
      { roleKey: UserRole.PROVIDER, label: 'Provider', description: 'Service provider role' },
      { roleKey: UserRole.ADMIN, label: 'Admin', description: 'Platform administrator role' },
    ];

    for (const role of defaults) {
      const existing = await this.roleDefinitionRepository.findOne({
        where: { roleKey: role.roleKey },
      });

      if (!existing) {
        await this.roleDefinitionRepository.save(
          this.roleDefinitionRepository.create({
            roleKey: role.roleKey,
            label: role.label,
            description: role.description,
            isSystem: true,
          }),
        );
        continue;
      }

      existing.label = role.label;
      existing.description = role.description;
      existing.isSystem = true;
      await this.roleDefinitionRepository.save(existing);
    }
  }

  private async seedUserRoleAssignments(): Promise<void> {
    const users = await this.userRepository.find({ select: ['id', 'role'] });

    for (const user of users) {
      const existing = await this.userRoleAssignmentRepository.find({
        where: { userId: user.id },
      });

      if (existing.length === 0) {
        await this.userRoleAssignmentRepository.save(
          this.userRoleAssignmentRepository.create({
            userId: user.id,
            roleKey: user.role,
            isPrimary: true,
          }),
        );
      }
    }
  }

  private async seedRolePermissions(): Promise<void> {
    const allPermissions = Object.values(PERMISSIONS);
    const rolesToSeed: UserRole[] = [UserRole.USER, UserRole.PROVIDER];

    for (const role of rolesToSeed) {
      const defaults = new Set(DEFAULT_ROLE_PERMISSIONS[role] || []);

      for (const permissionKey of allPermissions) {
        const existing = await this.rolePermissionRepository.findOne({
          where: { role, permissionKey },
        });

        if (!existing) {
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create({
              role,
              permissionKey,
              enabled: defaults.has(permissionKey),
            }),
          );
        }
      }
    }
  }

  private isSupportedRole(role: UserRole | string): role is UserRole {
    return role === UserRole.USER || role === UserRole.PROVIDER || role === UserRole.ADMIN;
  }

  private isKnownPermission(permissionKey: string): permissionKey is PermissionKey {
    return Object.values(PERMISSIONS).includes(permissionKey as PermissionKey);
  }

  private async syncPrimaryRoleToUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const assignments = await this.getUserRoleAssignments(userId);
    if (assignments.length === 0) return;

    const primary =
      assignments.find((assignment) => assignment.isPrimary) ?? assignments[0];

    if (!primary.isPrimary) {
      primary.isPrimary = true;
      await this.userRoleAssignmentRepository.save(primary);
    }

    if (this.isSupportedRole(primary.roleKey) && user.role !== primary.roleKey) {
      user.role = primary.roleKey;
      await this.userRepository.save(user);
    }
  }

  private async assertNotRemovingLastAdmin(userId: string): Promise<void> {
    const adminAssignments = await this.userRoleAssignmentRepository.find({
      where: { roleKey: UserRole.ADMIN },
    });

    const uniqueAdminUserIds = new Set(adminAssignments.map((assignment) => assignment.userId));
    const activeAdmins = await this.userRepository.count({
      where: {
        id: In(Array.from(uniqueAdminUserIds)),
        status: UserStatus.ACTIVE,
      },
    });

    if (activeAdmins <= 1 && uniqueAdminUserIds.has(userId)) {
      throw new BadRequestException('Cannot remove admin role from the last admin');
    }
  }
}
