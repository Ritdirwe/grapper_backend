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
import { BookingMilestone } from '../../domain/entities/booking-milestone.entity';
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
  BookingCreateResponseDto,
  BookingPaymentMetaDto,
  DeliverBookingDto,
  RequestCorrectionDto,
} from '../dto/booking.dto';
import { CreateCheckoutDto, CheckoutResponseDto } from '../dto/checkout.dto';
import { PaymentService } from '@contexts/billing/payment/application/services/payment.service';
import { TransactionType } from '@contexts/billing/payment/domain/value-objects/payment-enums.vo';
import { VerifyPaymentDto } from '@contexts/billing/payment/application/dto/payment.dto';
import { EmailService } from '@infrastructure/email/email.service';
import { NotificationOrchestratorService } from '@contexts/community/notification/application/services/notification-orchestrator.service';
import { NotificationCategory } from '@contexts/community/notification/application/dto/notification-event.dto';
import { NotificationType } from '@contexts/community/notification/domain/value-objects/notification-type.vo';
import { AdminPenaltySettingsService } from '@contexts/ops/admin/application/services/admin-penalty-settings.service';

const PLATFORM_FEE_RATIO = 0.15;

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingCorrection)
    private bookingCorrectionRepository: Repository<BookingCorrection>,
    @InjectRepository(BookingMilestone)
    private bookingMilestoneRepository: Repository<BookingMilestone>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private paymentService: PaymentService,
    private configService: ConfigService,
    private emailService: EmailService,
    private notificationOrchestratorService: NotificationOrchestratorService,
    private adminPenaltySettingsService: AdminPenaltySettingsService,
  ) {}

  async create(userId: string, dto: CreateBookingDto): Promise<BookingCreateResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId === userId) {
      throw new BadRequestException('Cannot book your own service');
    }

    const price = Number(service.price);
    const platformFee = price * PLATFORM_FEE_RATIO;
    const referenceCode = this.generateReference();
    const penaltySettings = await this.adminPenaltySettingsService.getCurrentSettings();
    const callbackUrl =
      this.configService.get<string>('payment.flutterwave.callbackUrl') ||
      this.configService.get<string>('payment.callbackUrl') ||
      this.configService.get<string>('app.frontendUrl') ||
      '';

    const booking = this.bookingRepository.create({
      ...dto,
      customerId: userId,
      providerId: service.providerId,
      serviceId: service.id,
      amount: price,
      platformFee,
      depositAmount: price,
      correctionsLimit: Number(penaltySettings.customerCorrectionFreeLimit || 0),
      correctionFee: 0,
      currency: service.currency || 'NGN',
      status: BookingStatus.PENDING,
      referenceCode,
      metadata: {
        callbackUrl,
      },
    });

    await this.bookingRepository.save(booking);

    await this.notificationOrchestratorService.notifyUser(service.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_CREATED,
      title: 'New booking request',
      body: `${service.title} has a new booking request.`,
      data: {
        bookingId: booking.id,
        serviceId: service.id,
        customerId: userId,
      },
    });

    const email = await this.getUserEmail(userId);
    const paymentMeta: BookingPaymentMetaDto = {
      amount: Number(booking.amount),
      currency: booking.currency || 'NGN',
      bookingId: booking.id,
      description: `${service.title} - Booking Payment`,
      email,
      referenceCode,
    };

    return {
      ...this.mapToResponseDto(booking),
      paymentMeta,
      callbackUrl,
    };
  }

  async createBookingCheckout(
    userId: string,
    bookingId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['service'],
    });

    if (!booking || booking.customerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking must be confirmed before checkout');
    }

    if (dto.paymentMeta.bookingId !== booking.id) {
      throw new BadRequestException('Payment metadata does not match booking');
    }

    const callbackUrl =
      dto.callbackUrl ||
      booking.metadata?.callbackUrl ||
      this.configService.get<string>('payment.flutterwave.callbackUrl') ||
      this.configService.get<string>('payment.callbackUrl') ||
      this.configService.get<string>('app.frontendUrl') ||
      '';
    const email = dto.paymentMeta.email || (await this.getUserEmail(userId));
    const referenceCode = booking.referenceCode || this.generateReference();

    if (!booking.referenceCode) {
      booking.referenceCode = referenceCode;
      await this.bookingRepository.save(booking);
    }

    const init = await this.paymentService.initializePayment(
      userId,
      {
        amount: Number(booking.amount),
        currency: booking.currency || 'NGN',
        type: TransactionType.BOOKING_PAYMENT,
        bookingId: booking.id,
        description:
          dto.paymentMeta.description || `${booking.service.title} - Booking Payment`,
        email,
        gatewayData: dto.paymentMeta.gatewayData || booking.metadata?.flutterwave,
      },
      {
        reference: referenceCode,
        callbackUrl,
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

  async verifyPaystackPayment(reference: string) {
    const dto: VerifyPaymentDto = { reference };
    return this.paymentService.verifyPayment(dto);
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

    const correctionFee = Number(booking.correctionFee || 0);
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
        callbackUrl:
          booking.metadata?.callbackUrl ||
          this.configService.get<string>('payment.flutterwave.callbackUrl') ||
          this.configService.get<string>('payment.callbackUrl') ||
          this.configService.get<string>('app.frontendUrl') ||
          '',
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
        callbackUrl:
          booking.metadata?.callbackUrl ||
          this.configService.get<string>('payment.flutterwave.callbackUrl') ||
          this.configService.get<string>('payment.callbackUrl') ||
          this.configService.get<string>('app.frontendUrl') ||
          '',
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

    await this.notifyCustomerToCheckout(booking.id);

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Booking confirmed',
      body: `Your booking${booking.referenceCode ? ` ${booking.referenceCode}` : ''} was confirmed by the provider.`,
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
      },
    });

    return this.mapToResponseDto(booking);
  }

  async start(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({ where: { id }, relations: ['service'] });

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

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_STARTED,
      title: 'Work started',
      body: `${booking.service?.title || 'Your booking'} is now in progress.`,
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
      },
    });

    return this.mapToResponseDto(booking);
  }

  async deliver(id: string, userId: string, dto: DeliverBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({ where: { id }, relations: ['service'] });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can deliver booking work');
    }

    const milestoneCount = await this.bookingMilestoneRepository.count({ where: { bookingId: booking.id } });
    if (milestoneCount > 0) {
      throw new BadRequestException('Use the booking milestone evidence flow for this booking');
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

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_DELIVERED,
      title: 'Work delivered',
      body: `${booking.service?.title || 'Your booking'} has been delivered and is awaiting your review.`,
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
      },
    });

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

    const milestoneCount = await this.bookingMilestoneRepository.count({ where: { bookingId: booking.id } });
    if (milestoneCount > 0) {
      throw new BadRequestException('Use the booking milestone approval flow for this booking');
    }

    if (booking.status !== BookingStatus.DELIVERED) {
      throw new BadRequestException('Booking must be delivered before approval');
    }

    booking.approveWork();
    await this.bookingRepository.save(booking);

    await this.notificationOrchestratorService.notifyUser(booking.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_DELIVERABLE_APPROVED,
      title: 'Delivery approved',
      body: `The customer approved ${booking.referenceCode || 'the booking'}.`,
      data: {
        bookingId: booking.id,
        customerId: booking.customerId,
      },
    });

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

    const penaltySettings = await this.adminPenaltySettingsService.getCurrentSettings();
    const freeLimit = Number(penaltySettings.customerCorrectionFreeLimit || 0);
    const isTrackedFreeCorrection = booking.requestCorrection(freeLimit);
    const correctionFee = !penaltySettings.customerCorrectionEnabled || isTrackedFreeCorrection
      ? 0
      : this.calculatePenaltyAmount(
          Number(booking.amount || 0),
          Number(penaltySettings.customerCorrectionFlatPenalty || 0),
          Number(penaltySettings.customerCorrectionPercentPenalty || 0),
        );
    const freeCorrection = correctionFee <= 0;

    booking.correctionFee = correctionFee;
    booking.correctionsLimit = freeLimit;
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

    await this.notificationOrchestratorService.notifyUser(booking.providerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_CORRECTION_REQUESTED,
      title: 'Correction requested',
      body: `A correction was requested for ${booking.referenceCode || 'a booking'}.`,
      data: {
        bookingId: booking.id,
        correctionId: correction.id,
        customerId: booking.customerId,
      },
    });

    return this.mapToResponseDto(booking);
  }

  async complete(id: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({ where: { id }, relations: ['service'] });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== userId) {
      throw new ForbiddenException('Only the provider can complete the booking');
    }

    const milestoneCount = await this.bookingMilestoneRepository.count({ where: { bookingId: booking.id } });
    if (milestoneCount > 0) {
      throw new BadRequestException('Use the booking milestone approval flow for this booking');
    }

    if (!booking.canComplete()) {
      throw new BadRequestException('Booking must be delivered to complete');
    }

    booking.complete();
    await this.bookingRepository.save(booking);

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_COMPLETED,
      title: 'Booking completed',
      body: `${booking.service?.title || 'Your booking'} has been completed.`,
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
      },
    });

    return this.mapToResponseDto(booking);
  }

  async cancel(id: string, userId: string, dto: CancelBookingDto): Promise<BookingResponseDto> {
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

    if (!booking.canCancel()) {
      throw new BadRequestException('Cannot cancel booking in current status');
    }

    booking.cancel(dto.reason, userId);
    await this.bookingRepository.save(booking);

    await this.notificationOrchestratorService.notifyUser(booking.customerId === userId ? booking.providerId : booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking cancelled',
      body: `${booking.service?.title || 'A booking'} was cancelled.`,
      data: {
        bookingId: booking.id,
        cancelledBy: userId,
      },
    });

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

  private calculatePenaltyAmount(baseAmount: number, flatPenalty: number, percentPenalty: number): number {
    const percentAmount = baseAmount * (percentPenalty / 100);
    return this.roundMoney(Math.max(flatPenalty + percentAmount, 0));
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async notifyCustomerToCheckout(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['service'],
    });

    if (!booking) {
      return;
    }

    const customerEmail = await this.getUserEmail(booking.customerId);
    if (!customerEmail) {
      return;
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl') || '';
    const bookingUrl = frontendUrl ? `${frontendUrl}/bookings/${booking.id}` : '';

    await this.notificationOrchestratorService.notifyUser(booking.customerId, {
      category: NotificationCategory.BOOKING,
      type: NotificationType.BOOKING_CHECKOUT_REQUIRED,
      title: 'Payment required',
      body: 'Your booking is confirmed and ready for payment.',
      data: {
        bookingId: booking.id,
        serviceId: booking.serviceId,
      },
    });

    await this.emailService.sendEmail({
      to: customerEmail,
      subject: `Your booking is confirmed${booking.service?.title ? `: ${booking.service.title}` : ''}`,
      text: [
        'Your booking has been confirmed and is ready for payment.',
        `Amount: ${booking.currency || 'NGN'} ${Number(booking.amount).toFixed(2)}`,
        bookingUrl ? `Open booking: ${bookingUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
        <p>Your booking has been confirmed and is ready for payment.</p>
        <p><strong>Amount:</strong> ${booking.currency || 'NGN'} ${Number(booking.amount).toFixed(2)}</p>
        ${bookingUrl ? `<p><a href="${bookingUrl}">Open booking</a></p>` : ''}
      `,
    });
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
