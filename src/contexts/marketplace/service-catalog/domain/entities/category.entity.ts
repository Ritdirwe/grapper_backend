import { Entity, Column, Tree, TreeChildren, TreeParent, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';

@Entity('categories')
@Tree('materialized-path')
export class Category extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'icon_url', nullable: true })
  iconUrl?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'service_count', default: 0 })
  serviceCount: number;

  @TreeChildren()
  children: Category[];

  @TreeParent()
  parent: Category;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
