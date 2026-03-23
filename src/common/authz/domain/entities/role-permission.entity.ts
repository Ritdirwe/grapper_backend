import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { UserRole } from '@contexts/identity/domain/value-objects/user-role.vo';

@Entity('role_permissions')
@Index(['role', 'permissionKey'], { unique: true })
export class RolePermissionEntity extends BaseEntity {
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'varchar', length: 128, name: 'permission_key' })
  permissionKey: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
