import { config } from 'dotenv';
import dataSource from '../infrastructure/database/data-source';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { Category } from '@contexts/marketplace/service-catalog/domain/entities/category.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Booking } from '@contexts/marketplace/booking/domain/entities/booking.entity';
import { Order } from '@contexts/marketplace/booking/domain/entities/order.entity';
import { Transaction } from '@contexts/billing/payment/domain/entities/transaction.entity';
import { UserRole, UserStatus } from '@contexts/identity/domain/value-objects/user-role.vo';
import { VerificationStatus } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';
import { ServiceStatus, PricingType, DeliveryType } from '@contexts/marketplace/service-catalog/domain/value-objects/service-enums.vo';
import { BookingStatus } from '@contexts/marketplace/booking/domain/value-objects/booking-enums.vo';
import {
  PaymentGateway,
  TransactionStatus,
  TransactionType,
} from '@contexts/billing/payment/domain/value-objects/payment-enums.vo';

config({ path: ['.env.local', '.env'] });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function seedRef(i: number) {
  return `seedpay-${Date.now()}-${i}`;
}

async function main() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Keep it idempotent.
    await queryRunner.query(`DELETE FROM transactions WHERE reference LIKE 'seedpay-%'`);

    const userRepo = queryRunner.manager.getRepository(User);
    const profileRepo = queryRunner.manager.getRepository(Profile);
    const categoryRepo = queryRunner.manager.getRepository(Category);
    const serviceRepo = queryRunner.manager.getRepository(Service);
    const bookingRepo = queryRunner.manager.getRepository(Booking);
    const orderRepo = queryRunner.manager.getRepository(Order);
    const txRepo = queryRunner.manager.getRepository(Transaction);

    let admin = await userRepo.findOne({ where: { email: 'admin@grapper.com' } });
    if (!admin) {
      admin = await userRepo.save(
        userRepo.create({
          email: 'admin@grapper.com',
          passwordHash: 'seeded',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true,
          phoneNumber: '+2348012345678',
        }) as any,
      );
    }

    let provider = await userRepo.findOne({ where: { email: 'pay.provider@grapper.com' } });
    if (!provider) {
      provider = await userRepo.save(
        userRepo.create({
          email: 'pay.provider@grapper.com',
          passwordHash: 'seeded',
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true,
          phoneNumber: '+2348020000000',
        }) as any,
      );
    }

    let customer = await userRepo.findOne({ where: { email: 'pay.customer@example.com' } });
    if (!customer) {
      customer = await userRepo.save(
        userRepo.create({
          email: 'pay.customer@example.com',
          passwordHash: 'seeded',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: false,
          phoneNumber: '+2348030000000',
        }) as any,
      );
    }

    const existingProviderProfile = await profileRepo.findOne({ where: { userId: provider.id } });
    if (!existingProviderProfile) {
      await profileRepo.save(
        profileRepo.create({
          userId: provider.id,
          fullName: 'Payment Seed Provider',
          displayName: 'Seed Provider',
          university: 'Seed University',
          bio: 'Seeded provider for payment testing.',
          country: 'Nigeria',
          city: 'Lagos',
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
        }),
      );
    }

    const existingCustomerProfile = await profileRepo.findOne({ where: { userId: customer.id } });
    if (!existingCustomerProfile) {
      await profileRepo.save(
        profileRepo.create({
          userId: customer.id,
          fullName: 'Payment Seed Customer',
          displayName: 'Seed Customer',
          university: 'Seed University',
          country: 'Nigeria',
          city: 'Abuja',
          verificationStatus: VerificationStatus.UNVERIFIED,
        }),
      );
    }

    let category = await categoryRepo.findOne({ where: { slug: 'seed-payments' } });
    if (!category) {
      const next = new Category();
      next.name = 'Seed Payments';
      next.slug = 'seed-payments';
      next.description = 'Seed category used for payment testing';
      next.isActive = true;
      next.displayOrder = 999;
      category = await categoryRepo.save(next);
    }

    let service = await serviceRepo.findOne({ where: { slug: 'seed-payment-service' } });
    if (!service) {
      const next = new Service();
      next.providerId = provider.id;
      next.categoryId = category.id;
      next.title = 'Seed Payment Service';
      next.slug = 'seed-payment-service';
      next.description = 'A seeded service to create orders/bookings and transactions.';
      next.shortDescription = 'Seeded service';
      next.price = 15000;
      next.currency = 'NGN';
      next.pricingType = PricingType.FIXED;
      next.deliveryType = DeliveryType.REMOTE;
      next.durationDays = 3;
      next.status = ServiceStatus.ACTIVE;
      next.tags = ['seed', 'payments'];
      service = await serviceRepo.save(next);
    }

    const booking = new Booking();
    booking.customerId = customer.id;
    booking.providerId = provider.id;
    booking.serviceId = service.id;
    booking.status = BookingStatus.CONFIRMED;
    booking.notes = 'Seed booking for payment testing';
    booking.amount = 15000;
    booking.currency = 'NGN';
    booking.depositAmount = 3000;
    booking.depositPaid = true;
    booking.finalPaymentPaid = false;
    booking.referenceCode = `SEED-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    booking.confirmedAt = daysAgo(8);
    const savedBooking = await bookingRepo.save(booking);

    const order = new Order();
    order.orderNumber = `SEED-ORD-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    order.customerId = customer.id;
    order.providerId = provider.id;
    order.serviceId = service.id;
    order.description = 'Seed order for payment testing';
    order.amount = 20000;
    order.currency = 'NGN';
    order.platformFee = 1000;
    order.providerEarnings = 19000;
    const savedOrder = await orderRepo.save(order);

    // Create a realistic mix of transactions for admin monitoring.
    const seedTransactions: Array<Partial<Transaction> & { createdAt: Date }> = [
      {
        reference: seedRef(1),
        userId: customer.id,
        type: TransactionType.BOOKING_PAYMENT,
        amount: 3000,
        currency: 'NGN',
        status: TransactionStatus.COMPLETED,
        gateway: PaymentGateway.PAYSTACK,
        bookingId: savedBooking.id,
        description: 'Booking deposit (seed)',
        paidAt: daysAgo(8),
        createdAt: daysAgo(8),
      },
      {
        reference: seedRef(2),
        userId: customer.id,
        type: TransactionType.ORDER_PAYMENT,
        amount: 20000,
        currency: 'NGN',
        status: TransactionStatus.COMPLETED,
        gateway: PaymentGateway.PAYSTACK,
        orderId: savedOrder.id,
        description: 'Order payment (seed)',
        paidAt: daysAgo(6),
        createdAt: daysAgo(6),
      },
      {
        reference: seedRef(3),
        userId: provider.id,
        type: TransactionType.PAYOUT,
        amount: 12000,
        currency: 'NGN',
        status: TransactionStatus.PENDING,
        gateway: PaymentGateway.PAYSTACK,
        description: 'Provider payout pending (seed)',
        createdAt: daysAgo(3),
      },
      {
        reference: seedRef(4),
        userId: customer.id,
        type: TransactionType.REFUND,
        amount: 5000,
        currency: 'NGN',
        status: TransactionStatus.REFUNDED,
        gateway: PaymentGateway.PAYSTACK,
        bookingId: savedBooking.id,
        description: 'Partial refund (seed)',
        createdAt: daysAgo(2),
      },
      {
        reference: seedRef(5),
        userId: customer.id,
        type: TransactionType.BOOKING_PAYMENT,
        amount: 12000,
        currency: 'NGN',
        status: TransactionStatus.FAILED,
        gateway: PaymentGateway.PAYSTACK,
        bookingId: savedBooking.id,
        description: 'Booking completion payment failed (seed)',
        failureReason: 'Insufficient funds',
        failedAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
    ];

    // Add some extra volume across the last 14 days.
    for (let i = 0; i < 18; i++) {
      const day = (i % 14) + 1;
      seedTransactions.push({
        reference: seedRef(100 + i),
        userId: customer.id,
        type: TransactionType.ORDER_PAYMENT,
        amount: 2500 + i * 350,
        currency: 'NGN',
        status: i % 5 === 0 ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        gateway: PaymentGateway.PAYSTACK,
        orderId: savedOrder.id,
        description: 'Seed order payment',
        paidAt: i % 5 === 0 ? undefined : daysAgo(day),
        createdAt: daysAgo(day),
      });
    }

    const inserted: Transaction[] = [];
    for (const tx of seedTransactions) {
      const entity = new Transaction();
      entity.reference = tx.reference!;
      entity.userId = tx.userId!;
      entity.type = tx.type!;
      entity.amount = tx.amount as any;
      entity.currency = tx.currency || 'NGN';
      entity.status = tx.status!;
      entity.gateway = tx.gateway!;
      entity.orderId = tx.orderId;
      entity.bookingId = tx.bookingId;
      entity.description = tx.description;
      (entity as any).paidAt = (tx as any).paidAt;
      (entity as any).failedAt = (tx as any).failedAt;
      (entity as any).failureReason = (tx as any).failureReason;

      const saved = await txRepo.save(entity);
      inserted.push(saved);
    }

    // Backdate created_at for nicer charts.
    for (let idx = 0; idx < inserted.length; idx++) {
      const desired = seedTransactions[idx].createdAt;
      if (!desired) continue;
      await queryRunner.query(
        `UPDATE transactions SET created_at = $2, updated_at = $2 WHERE id = $1`,
        [inserted[idx].id, desired],
      );
    }

    await queryRunner.commitTransaction();
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded ${inserted.length} payment transactions (seedpay-*)`);
    // eslint-disable-next-line no-console
    console.log(`   Customer: pay.customer@example.com`);
    // eslint-disable-next-line no-console
    console.log(`   Provider: pay.provider@grapper.com`);
  } catch (err: any) {
    await queryRunner.rollbackTransaction();
    // eslint-disable-next-line no-console
    console.error('❌ Seed payments failed:', err?.message || err);
    throw err;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main();
