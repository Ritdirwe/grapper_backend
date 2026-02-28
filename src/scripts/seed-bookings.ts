import { config } from 'dotenv';
import { randomBytes } from 'crypto';
import dataSource from '../infrastructure/database/data-source';

import { User } from '@contexts/identity/domain/entities/user.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { Category } from '@contexts/marketplace/service-catalog/domain/entities/category.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Booking } from '@contexts/marketplace/booking/domain/entities/booking.entity';

import { UserRole, UserStatus } from '@contexts/identity/domain/value-objects/user-role.vo';
import { VerificationStatus } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';
import {
  ServiceStatus,
  PricingType,
  DeliveryType,
} from '@contexts/marketplace/service-catalog/domain/value-objects/service-enums.vo';
import { BookingStatus } from '@contexts/marketplace/booking/domain/value-objects/booking-enums.vo';

config({ path: ['.env.local', '.env'] });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function seedRef(i: number) {
  return `seedbkg-${Date.now()}-${i}-${randomBytes(2).toString('hex')}`;
}

async function main() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Keep it idempotent and non-destructive.
    const seeded = await queryRunner.query(
      `SELECT id FROM bookings WHERE reference_code LIKE 'seedbkg-%'`,
    );
    const seededIds: string[] = (seeded || []).map((r: any) => String(r.id));
    if (seededIds.length) {
      await queryRunner.query(`DELETE FROM booking_messages WHERE booking_id = ANY($1)`, [seededIds]);
      await queryRunner.query(`DELETE FROM booking_files WHERE booking_id = ANY($1)`, [seededIds]);
      await queryRunner.query(`DELETE FROM booking_corrections WHERE booking_id = ANY($1)`, [seededIds]);
    }
    await queryRunner.query(`DELETE FROM bookings WHERE reference_code LIKE 'seedbkg-%'`);

    const userRepo = queryRunner.manager.getRepository(User);
    const profileRepo = queryRunner.manager.getRepository(Profile);
    const categoryRepo = queryRunner.manager.getRepository(Category);
    const serviceRepo = queryRunner.manager.getRepository(Service);
    const bookingRepo = queryRunner.manager.getRepository(Booking);

    let provider = await userRepo.findOne({ where: { email: 'seed.provider@gripper.com' } });
    if (!provider) {
      provider = await userRepo.save(
        userRepo.create({
          email: 'seed.provider@gripper.com',
          passwordHash: 'seeded',
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true,
          phoneNumber: '+2348011111111',
        }) as any,
      );
    }

    let customer = await userRepo.findOne({ where: { email: 'seed.customer@example.com' } });
    if (!customer) {
      customer = await userRepo.save(
        userRepo.create({
          email: 'seed.customer@example.com',
          passwordHash: 'seeded',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: false,
          phoneNumber: '+2348022222222',
        }) as any,
      );
    }

    const providerProfile = await profileRepo.findOne({ where: { userId: provider.id } });
    if (!providerProfile) {
      await profileRepo.save(
        profileRepo.create({
          userId: provider.id,
          fullName: 'Seed Booking Provider',
          displayName: 'Seed Provider',
          university: 'Seed University',
          bio: 'Seeded provider for booking testing.',
          country: 'Nigeria',
          city: 'Lagos',
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
        }),
      );
    }

    const customerProfile = await profileRepo.findOne({ where: { userId: customer.id } });
    if (!customerProfile) {
      await profileRepo.save(
        profileRepo.create({
          userId: customer.id,
          fullName: 'Seed Booking Customer',
          displayName: 'Seed Customer',
          university: 'Seed University',
          country: 'Nigeria',
          city: 'Abuja',
          verificationStatus: VerificationStatus.UNVERIFIED,
        }),
      );
    }

    let category = await categoryRepo.findOne({ where: { slug: 'seed-bookings' } });
    if (!category) {
      const next = new Category();
      next.name = 'Seed Bookings';
      next.slug = 'seed-bookings';
      next.description = 'Seed category used for booking testing';
      next.isActive = true;
      next.displayOrder = 998;
      category = await categoryRepo.save(next);
    }

    let service = await serviceRepo.findOne({ where: { slug: 'seed-booking-service' } });
    if (!service) {
      const next = new Service();
      next.providerId = provider.id;
      next.categoryId = category.id;
      next.title = 'Seed Booking Service';
      next.slug = 'seed-booking-service';
      next.description = 'A seeded service to generate bookings across statuses.';
      next.shortDescription = 'Seeded booking service';
      next.price = 12000;
      next.currency = 'NGN';
      next.pricingType = PricingType.FIXED;
      next.deliveryType = DeliveryType.REMOTE;
      next.durationDays = 2;
      next.status = ServiceStatus.ACTIVE;
      next.tags = ['seed', 'bookings'];
      service = await serviceRepo.save(next);
    }

    const templates: Array<{
      status: BookingStatus;
      daysBack: number;
      depositPaid?: boolean;
      finalPaymentPaid?: boolean;
      customerApproved?: boolean;
      correctionsUsed?: number;
      cancellationReason?: string;
    }> = [
      { status: BookingStatus.PENDING_DEPOSIT, daysBack: 1, depositPaid: false },
      { status: BookingStatus.PENDING, daysBack: 2, depositPaid: true },
      { status: BookingStatus.CONFIRMED, daysBack: 3, depositPaid: true },
      { status: BookingStatus.IN_PROGRESS, daysBack: 4, depositPaid: true },
      { status: BookingStatus.DELIVERED, daysBack: 5, depositPaid: true },
      { status: BookingStatus.REVISION_REQUESTED, daysBack: 6, depositPaid: true, correctionsUsed: 1 },
      {
        status: BookingStatus.PENDING_COMPLETION_PAYMENT,
        daysBack: 7,
        depositPaid: true,
        customerApproved: true,
      },
      {
        status: BookingStatus.COMPLETED,
        daysBack: 10,
        depositPaid: true,
        finalPaymentPaid: true,
        customerApproved: true,
      },
      {
        status: BookingStatus.CANCELLED,
        daysBack: 8,
        depositPaid: true,
        cancellationReason: 'Seed cancellation',
      },
      { status: BookingStatus.DISPUTED, daysBack: 9, depositPaid: true },
    ];

    const inserted: Booking[] = [];
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const b = new Booking();
      b.customerId = customer.id;
      b.providerId = provider.id;
      b.serviceId = service.id;
      b.amount = 12000;
      b.currency = 'NGN';
      b.referenceCode = seedRef(i + 1).toUpperCase();
      b.status = t.status;
      b.depositAmount = 2400;
      b.platformFee = 1800;
      b.depositPaid = Boolean(t.depositPaid);
      b.finalPaymentPaid = Boolean(t.finalPaymentPaid);
      b.customerApproved = Boolean(t.customerApproved);
      b.customerApprovedAt = t.customerApproved ? daysAgo(t.daysBack - 1) : undefined;
      b.correctionsUsed = t.correctionsUsed ?? 0;
      b.notes = `Seed booking (${t.status})`;

      if (t.status === BookingStatus.CONFIRMED) b.confirmedAt = daysAgo(t.daysBack);
      if (t.status === BookingStatus.IN_PROGRESS) {
        b.confirmedAt = daysAgo(t.daysBack + 1);
        b.startedAt = daysAgo(t.daysBack);
      }
      if (t.status === BookingStatus.DELIVERED || t.status === BookingStatus.REVISION_REQUESTED) {
        b.confirmedAt = daysAgo(t.daysBack + 2);
        b.startedAt = daysAgo(t.daysBack + 1);
        b.metadata = {
          delivery: {
            note: 'Seed delivery',
            attachments: ['https://example.com/seed/attachment.zip'],
            deliveredAt: daysAgo(t.daysBack).toISOString(),
          },
        };
      }
      if (t.status === BookingStatus.PENDING_COMPLETION_PAYMENT) {
        b.confirmedAt = daysAgo(t.daysBack + 3);
        b.startedAt = daysAgo(t.daysBack + 2);
        b.customerApproved = true;
        b.customerApprovedAt = daysAgo(t.daysBack + 1);
      }
      if (t.status === BookingStatus.COMPLETED) {
        b.confirmedAt = daysAgo(t.daysBack + 6);
        b.startedAt = daysAgo(t.daysBack + 5);
        b.customerApproved = true;
        b.customerApprovedAt = daysAgo(t.daysBack + 3);
        b.completedAt = daysAgo(t.daysBack);
      }
      if (t.status === BookingStatus.CANCELLED) {
        b.cancelledAt = daysAgo(t.daysBack);
        b.cancelledBy = customer.id;
        b.cancellationReason = t.cancellationReason;
      }

      const saved = await bookingRepo.save(b);
      inserted.push(saved);

      // Backdate created_at to make admin lists/charts feel realistic.
      await queryRunner.query(
        `UPDATE bookings SET created_at = $2, updated_at = $2 WHERE id = $1`,
        [saved.id, daysAgo(t.daysBack)],
      );
    }

    await queryRunner.commitTransaction();
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded ${inserted.length} bookings (seedbkg-*)`);
    // eslint-disable-next-line no-console
    console.log(`   Customer: seed.customer@example.com`);
    // eslint-disable-next-line no-console
    console.log(`   Provider: seed.provider@gripper.com`);
  } catch (err: any) {
    await queryRunner.rollbackTransaction();
    // eslint-disable-next-line no-console
    console.error('❌ Seed bookings failed:', err?.message || err);
    throw err;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main();
