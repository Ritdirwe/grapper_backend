import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { Service } from './service.entity';

@Entity('service_images')
@Index(['serviceId'])
export class ServiceImage extends BaseEntity {
  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ nullable: true })
  caption?: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;
}
