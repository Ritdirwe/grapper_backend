import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';

@Entity('notifications')
@Index(['recipientId'])
export class Notification extends BaseEntity {
  @Column({ name: 'recipient_id' })
  recipientId: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ default: 'in_app' })
  channel: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType?: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId?: string;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string;

  @Column({ name: 'read_at', nullable: true })
  readAt?: Date;

  @Column({ name: 'sent_at', nullable: true })
  sentAt?: Date;
}
