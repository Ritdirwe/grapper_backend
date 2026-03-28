import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingCorrection } from '../../domain/entities/booking-correction.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import {
  BookingStatus,
  CorrectionStatus,
} from '../../domain/value-objects/booking-enums.vo';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  BookingResponseDto,
  DeliverBookingDto,
  RequestCorrectionDto,
} from '../dto/booking.dto';
import { CreateCheckoutDto, CheckoutResponseDto } from '../dto/checkout.dto';
import { PaymentService } from '@contexts/billing/payment/application/services/payment.service';
import { TransactionType } from '@contexts/billing/payment/domain/value-objects/payment-enums.vo';
import { VerifyPaymentDto } from '@contexts/billing/payment/application/dto/payment.dto';

const DEPOSIT_RATIO = 0.2;
const PLATFORM_FEE_RATIO = 0.15;

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingCorrection)
    private bookingCorrectionRepository: Repository<BookingCorrection>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private paymentService: PaymentService,
    private configService: ConfigService,
  ) {}

  async createCheckout(userId: string, dto: CreateCheckoutDto): Promise<CheckoutResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const price = Number(service.price);
    const depositAmount = price * DEPOSIT_RATIO;
    const platformFee = price * PLATFORM_FEE_RATIO;
    const referenceCode = this.generateReference();

    const booking = this.bookingRepository.create({
      customerId: userId,
      providerId: service.providerId,
      serviceId: service.id,
      amount: price,
      depositAmount,
      platformFee,
      correctionFee: this.getDefaultCorrectionFee(),
      currency: service.currency || 'NGN',
      status: BookingStatus.PENDING_DEPOSIT,
      referenceCode,
      metadata: {
        redirectURL: dto.redirectURL,
        flutterwave: dto.flutterwave,
      },
    });

    await this.bookingRepository.save(booking);

    const email = dto.email || (await this.getUserEmail(userId));
    const init = await this.paymentService.initializePayment(
      userId,
      {
        amount: depositAmount,
        currency: booking.currency,
        type: TransactionType.BOOKING_PAYMENT,
        bookingId: booking.id,
        description: `${service.title} - 20% Deposit`,
        email,
        gatewayData: dto.flutterwave,
      },
      {
        reference: referenceCode,
        callbackUrl: dto.redirectURL,
      },
    );

    booking.paystackReference = init.reference;
    await this.bookingRepository.save(booking);

    return {
      url: init.authorizationUrl,
      authorizationUrl: init.authorizationUrl,
      clientSecret: init.clientSecret,
      accessCode: init.accessCode,
      mode: init.mode,
      publicKey: init.publicKey,
      processor: String(init.processor || ''),
      reference: init.reference,
    };
  }

  async createStripeCheckout(userId: string, dto: CreateCheckoutDto): Promise<CheckoutResponseDto> {
    return this.createCheckout(userId, dto);
  }

  async createPaystackCheckout(userId: string, dto: CreateCheckoutDto): Promise<CheckoutResponseDto> {
    return this.createCheckout(userId, dto);
  }

  async verifyPaystackPayment(reference: string) {
    const dto: VerifyPaymentDto = { reference };
    return this.paymentService.verifyPayment(dto);
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

    if (!booking.customerApproved) {
      throw new BadRequestException('Customer approval is required before completion payment');
    }

    const remainingAmount = booking.amount - (booking.depositAmount || 0);
    const referenceCode = `${booking.referenceCode}-completion`;

    const email = await this.getUserEmail(userId);
    const init = await this.paymentService.initializePayment(
      userId,
      {
        amount: remainingAmount,
        currency: booking.currency || 'NGN',
        type: TransactionType.BOOKING_PAYMENT,
        bookingId: booking.id,
        description: `${booking.service.title} - Completion Payment`,
        email,
        gatewayData: booking.metadata?.flutterwave,
      },
      {
        reference: referenceCode,
        callbackUrl: booking.metadata?.redirectURL,
      },
    );

    booking.paystackReference = init.reference;
    await this.bookingRepository.save(booking);

    return {
      url: init.authorizationUrl,
      authorizationUrl: init.authorizationUrl,
      clientSecret: init.clientSecret,
      accessCode: init.accessCode,
      mode: init.mode,
      publicKey: init.publicKey,
      processor: String(init.processor || ''),
      reference: init.reference,
    };
  }

  async createPaystackCompletionPayment(userId: string, bookingId: string): Promise<CheckoutResponseDto> {
    return this.createFinalPaymentSession(userId, bookingId);
  }

  async createPaystackCorrectionPayment(userId: string, bookingId: string): Promise<CheckoutResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking || booking.customerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const pendingCorrection = await this.bookingCorrectionRepository.findOne({
      where: {
        bookingId,
        status: CorrectionStatus.PENDING_PAYMENT,
      },
      order: { createdAt: 'DESC' },
    });

    if (!pendingCorrection) {
      throw new BadRequestException('No paid correction request is pending payment');
    }

    const correctionFee = Number(booking.correctionFee || this.getDefaultCorrectionFee());
    if (correctionFee <= 0) {
      throw new BadRequestException('Correction fee is not configured');
    }

    const reference = `${booking.referenceCode}-correction-${pendingCorrection.correctionNumber}`;

    const init = await this.paymentService.initializePayment(
      userId,
      {
        amount: correctionFee,
        currency: booking.currency || 'NGN',
        type: TransactionType.BOOKING_PAYMENT,
        bookingId: booking.id,
        description: `Correction payment for booking: ${booking.referenceCode}`,
        email: await this.getUserEmail(userId),
        gatewayData: booking.metadata?.flutterwave,
      },
      {
        reference,
        callbackUrl: booking.metadata?.redirectURL,
      },
    );

    pendingCorrection.paymentReference = init.reference;
    await this.bookingCorrectionRepository.save(pendingCorrection);

    return {
      url: init.authorizationUrl,
      authorizationUrl: init.authorizationUrl,
      clientSecret: init.clientSecret,
      accessCode: init.accessCode,
      mode: init.mode,
      publicKey: init.publicKey,
      processor: String(init.processor || ''),
      reference: init.reference,
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

    const init = await this.paymentService.initializePayment(
      userId,
      {
        amount: commissionAmount,
        currency: booking.currency || 'NGN',
        type: TransactionType.ORDER_PAYMENT,
        bookingId: booking.id,
        description: `Commission for booking: ${booking.referenceCode}`, 
        email: await this.getUserEmail(userId),
        gatewayData: booking.metadata?.flutterwave,
      },
      {
        reference: referenceCode,
        callbackUrl: booking.metadata?.redirectURL,
      },
    );

    return {
      url: init.authorizationUrl,
      authorizationUrl: init.authorizationUrl,
      clientSecret: init.clientSecret,
      accessCode: init.accessCode,
      mode: init.mode,
      publicKey: init.publicKey,
      processor: String(init.processor || ''),
      reference: init.reference,
    };
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
      correctionFee: this.getDefaultCorrectionFee(),
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

  async update(id: string, userId: string, dto: UpdateBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

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
    const booking = await this.bookingRepository.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

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
    const booking = await this.bookingRepository.findOne({ where: { id } });

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

  async deliver(id: string, userId: string, dto: DeliverBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can deliver booking work');
    }

    if (![BookingStatus.IN_PROGRESS, BookingStatus.REVISION_REQUESTED].includes(booking.status)) {
      throw new BadRequestException('Booking must be in progress or revision requested to deliver');
    }

    booking.status = BookingStatus.DELIVERED;
    booking.metadata = {
      ...(booking.metadata || {}),
      delivery: {
        note: dto.note,
        attachments: dto.attachments,
        deliveredAt: new Date().toISOString(),
      },
    };
    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async approveDelivery(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can approve delivery');
    }

    if (booking.status !== BookingStatus.DELIVERED) {
      throw new BadRequestException('Booking must be delivered before approval');
    }

    booking.approveWork();
    await this.bookingRepository.save(booking);

    return this.mapToResponseDto(booking);
  }

  async requestCorrection(
    id: string,
    userId: string,
    dto: RequestCorrectionDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== userId) {
      throw new ForbiddenException('Only the customer can request corrections');
    }

    if (booking.status !== BookingStatus.DELIVERED) {
      throw new BadRequestException('Booking must be delivered before requesting correction');
    }

    const freeCorrection = booking.requestCorrection();
    const correction = this.bookingCorrectionRepository.create({
      bookingId: booking.id,
      requestedBy: userId,
      description: dto.description,
      attachments: dto.attachments,
      correctionNumber: booking.correctionsUsed,
      isPaid: freeCorrection,
      status: freeCorrection ? CorrectionStatus.PENDING : CorrectionStatus.PENDING_PAYMENT,
    });

    if (freeCorrection) {
      booking.status = BookingStatus.REVISION_REQUESTED;
    }

    await this.bookingRepository.save(booking);
    await this.bookingCorrectionRepository.save(correction);

    return this.mapToResponseDto(booking);
  }

  async complete(id: string, userId: string): Promise<BookingResponseDto> {
    return this.deliver(id, userId, {
      note: 'Delivered via legacy complete endpoint',
    });
  }

  async cancel(id: string, userId: string, dto: CancelBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

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

    return bookings.map((booking) => this.mapToResponseDto(booking));
  }

  async getProviderBookings(providerId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.find({
      where: { providerId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) => this.mapToResponseDto(booking));
  }

  private async findBookingByPaymentReference(reference: string): Promise<Booking | null> {
    const direct = await this.bookingRepository.findOne({
      where: [{ referenceCode: reference }, { paystackReference: reference }],
    });
    if (direct) {
      return direct;
    }

    const normalizedReference = reference
      .replace(/-completion$/, '')
      .replace(/-correction-\d+$/, '');

    return this.bookingRepository.findOne({
      where: { referenceCode: normalizedReference },
    });
  }

  private getDefaultCorrectionFee(): number {
    return Number(this.configService.get('booking.correctionFee', 0));
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
      correctionsUsed: booking.correctionsUsed,
      correctionsLimit: booking.correctionsLimit,
      correctionFee: Number(booking.correctionFee || 0),
      customerApproved: booking.customerApproved,
      customerApprovedAt: booking.customerApprovedAt,
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
