import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';

@Entity('permission_definitions')
export class PermissionDefinitionEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, name: 'permission_key' })
  permissionKey: string;

  @Column({ type: 'varchar', length: 128 })
  label: string;

  @Column({ type: 'varchar', length: 64 })
  domain: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;
}
