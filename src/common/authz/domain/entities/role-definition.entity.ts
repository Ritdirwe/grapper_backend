import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';

@Entity('role_definitions')
export class RoleDefinitionEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'role_key' })
  roleKey: string;

  @Column({ type: 'varchar', length: 64 })
  label: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', name: 'is_system', default: true })
  isSystem: boolean;
}
