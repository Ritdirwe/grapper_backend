import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@common/domain/base-entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Booking } from './booking.entity';

@Entity('booking_files')
@Index(['bookingId'])
@Index(['uploadedBy'])
export class BookingFile extends BaseEntity {
  @Column({ name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, booking => booking.files)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column()
  filename: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column()
  url: string;

  @Column({ name: 'file_type', default: 'attachment' })
  fileType: string; // 'attachment' | 'deliverable' | 'correction'
}
