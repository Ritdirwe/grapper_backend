import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../domain/entities/booking.entity';
import { Service } from '../../../service-catalog/domain/entities/service.entity';
import { Profile } from '../../../user-management/domain/entities/profile.entity';
import { BookingStatus } from '../../domain/value-objects/booking-enums.vo';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  BookingResponseDto,
} from '../dto/booking.dto';
import { CreateCheckoutDto, CheckoutResponseDto } from '../dto/checkout.dto';
import { StripeService } from '../../../payment/infrastructure/gateways/stripe.service';
import { PaystackService } from '../../../payment/infrastructure/gateways/paystack.service';
import { randomBytes } from 'crypto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
    @Inject(forwardRef(() => PaystackService))
    private paystackService: PaystackService,
  ) {}

  async createStripeCheckout(userId: string, dto: CreateCheckoutDto): Promise<CheckoutResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const price = Number(service.price);
    const depositAmount = price * 0.5;
    const platformFee = price * 0.15;
    const referenceCode = this.generateReference();

    // Create booking in PENDING_DEPOSIT state
    const booking = this.bookingRepository.create({
      customerId: userId,
      providerId: service.providerId,
      serviceId: service.id,
      amount: price,
      depositAmount,
      platformFee,
      currency: service.currency || 'USD',
      status: BookingStatus.PENDING_DEPOSIT,
      referenceCode,
    });

    const session = await this.stripeService.createCheckoutSession({
      customerEmail: dto.email || (await this.getUserEmail(userId)),
      lineItems: [
        {
          price_data: {
            currency: (service.currency || 'USD').toLowerCase(),
            product_data: {
              name: `${service.title} - 50% Deposit`,
              description: `Booking reference: ${referenceCode}`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      successUrl: `${dto.redirectURL}?status=success&reference=${referenceCode}`,
      cancelUrl: `${dto.redirectURL}?status=cancelled&reference=${referenceCode}`,
      metadata: {
        bookingId: booking.id,
        referenceCode,
        userId,
      },
    });

    booking.stripeSessionId = session.id;
    await this.bookingRepository.save(booking);

    return {
      url: session.url,
      processor: 'stripe',
      reference: referenceCode,
    };
  }

  async createPaystackCheckout(userId: string, dto: CreateCheckoutDto): Promise<CheckoutResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const price = Number(service.price);
    const depositAmount = price * 0.5;
    const platformFee = price * 0.15;
    const referenceCode = this.generateReference();

    const booking = this.bookingRepository.create({
      customerId: userId,
      providerId: service.providerId,
      serviceId: service.id,
      amount: price,
      depositAmount,
      platformFee,
      currency: service.currency || 'NGN',
      status: BookingStatus.PENDING_DEPOSIT,
      referenceCode,
    });

    const initResult = await this.paystackService.initializePayment({
      amount: depositAmount,
      email: dto.email || (await this.getUserEmail(userId)),
      reference: referenceCode,
      currency: service.currency || 'NGN',
      metadata: {
        bookingId: booking.id,
        userId,
      },
      callbackUrl: dto.redirectURL,
    });

    booking.paystackReference = initResult.reference;
    await this.bookingRepository.save(booking);

    return {
      url: initResult.authorizationUrl,
      processor: 'paystack',
      reference: referenceCode,
    };
  }

  async verifyPaystackPayment(reference: string) {
    const booking = await this.bookingRepository.findOne({
      where: { referenceCode: reference },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const verification = await this.paystackService.verifyPayment(reference);

    if (verification.success && !booking.depositPaid) {
      booking.depositPaid = true;
      booking.status = BookingStatus.PENDING; // Moves to provider for confirmation
      await this.bookingRepository.save(booking);
    }

    return verification;
  }

  async createFinalPaymentSession(userId: string, bookingId: string): Promise<CheckoutResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['service'],
    });

    if (!booking || booking.customerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (!booking.depositPaid) {
      throw new BadRequestException('Deposit must be paid first');
    }

    const remainingAmount = booking.amount - (booking.depositAmount || 0);
    const referenceCode = `${booking.referenceCode}-final`;

    const session = await this.stripeService.createCheckoutSession({
      customerEmail: await this.getUserEmail(userId),
      lineItems: [
        {
          price_data: {
            currency: (booking.currency || 'USD').toLowerCase(),
            product_data: {
              name: `${booking.service.title} - Final Payment`,
              description: `Remaining 50% for booking: ${booking.referenceCode}`,
            },
            unit_amount: Math.round(remainingAmount * 100),
          },
          quantity: 1,
        },
      ],
      successUrl: `${booking.metadata?.redirectURL || ''}?status=success&reference=${referenceCode}`,
      cancelUrl: `${booking.metadata?.redirectURL || ''}?status=cancelled&reference=${referenceCode}`,
      metadata: {
        bookingId: booking.id,
        type: 'final_payment',
      },
    });

    return {
      url: session.url,
      processor: 'stripe',
      reference: referenceCode,
    };
  }

  async createCommissionPaymentSession(userId: string, bookingId: string): Promise<CheckoutResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking || booking.providerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const commissionAmount = booking.platformFee || 0;
    const referenceCode = `${booking.referenceCode}-commission`;

    const session = await this.stripeService.createCheckoutSession({
      customerEmail: await this.getUserEmail(userId),
      lineItems: [
        {
          price_data: {
            currency: (booking.currency || 'USD').toLowerCase(),
            product_data: {
              name: `Platform Commission`,
              description: `Commission for booking: ${booking.referenceCode}`,
            },
            unit_amount: Math.round(commissionAmount * 100),
          },
          quantity: 1,
        },
      ],
      successUrl: `?status=success&reference=${referenceCode}`,
      cancelUrl: `?status=cancelled&reference=${referenceCode}`,
      metadata: {
        bookingId: booking.id,
        type: 'commission',
      },
    });

    return {
      url: session.url,
      processor: 'stripe',
      reference: referenceCode,
    };
  }

  private generateReference(): string {
    return 'GRP-' + randomBytes(4).toString('hex').toUpperCase();
  }

  private async getUserEmail(userId: string): Promise<string> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    return profile?.user?.email || '';
  }

  async create(customerId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId === customerId) {
      throw new BadRequestException('Cannot book your own service');
    }

    const booking = this.bookingRepository.create({
      ...dto,
      customerId,
      providerId: service.providerId,
      amount: service.price,
      currency: service.currency,
    });

    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async findById(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['service'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only customer or provider can view
    if (booking.customerId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const customerProfile = await this.profileRepository.findOne({
      where: { userId: booking.customerId },
    });

    const providerProfile = await this.profileRepository.findOne({
      where: { userId: booking.providerId },
    });

    return this.mapToResponseDto(booking, customerProfile, providerProfile);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only customer can update
    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can update the booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only update pending bookings');
    }

    Object.assign(booking, dto);
    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async confirm(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only provider can confirm
    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can confirm the booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only confirm pending bookings');
    }

    booking.confirm();
    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async start(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can start the booking');
    }

    if (!booking.canStart()) {
      throw new BadRequestException('Booking must be confirmed to start');
    }

    booking.start();
    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async complete(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can complete the booking');
    }

    if (!booking.canComplete()) {
      throw new BadRequestException('Booking must be in progress to complete');
    }

    booking.complete();
    await this.bookingRepository.save(booking);

    // Increment service orders
    await this.serviceRepository.increment({ id: booking.serviceId }, 'totalOrders', 1);

    return this.mapToResponseDto(booking);
  }

  async cancel(
    id: string,
    userId: string,
    dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Both customer and provider can cancel
    if (booking.customerId !== userId && booking.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!booking.canCancel()) {
      throw new BadRequestException('Cannot cancel booking in current status');
    }

    booking.cancel(dto.reason, userId);
    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async getCustomerBookings(customerId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.find({
      where: { customerId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });

    return bookings.map(b => this.mapToResponseDto(b));
  }

  async getProviderBookings(providerId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.find({
      where: { providerId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });

    return bookings.map(b => this.mapToResponseDto(b));
  }

  private mapToResponseDto(
    booking: Booking,
    customerProfile?: Profile,
    providerProfile?: Profile,
  ): BookingResponseDto {
    return {
      id: booking.id,
      customerId: booking.customerId,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      status: booking.status,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      notes: booking.notes,
      location: booking.location,
      requirements: booking.requirements,
      amount: booking.amount,
      currency: booking.currency,
      confirmedAt: booking.confirmedAt,
      startedAt: booking.startedAt,
      completedAt: booking.completedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      cancelledBy: booking.cancelledBy,
      referenceCode: booking.referenceCode,
      depositAmount: booking.depositAmount,
      platformFee: booking.platformFee,
      depositPaid: booking.depositPaid,
      finalPaymentPaid: booking.finalPaymentPaid,
      service: booking.service
        ? {
            id: booking.service.id,
            title: booking.service.title,
            slug: booking.service.slug,
          }
        : undefined,
      customer: customerProfile
        ? {
            id: customerProfile.userId,
            displayName: customerProfile.displayName,
            avatarUrl: customerProfile.avatarUrl,
          }
        : undefined,
      provider: providerProfile
        ? {
            id: providerProfile.userId,
            displayName: providerProfile.displayName,
            avatarUrl: providerProfile.avatarUrl,
          }
        : undefined,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
