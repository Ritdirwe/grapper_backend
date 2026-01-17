import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../domain/entities/order.entity';
import { Milestone } from '../../domain/entities/milestone.entity';
import { Service } from '../../../service-catalog/domain/entities/service.entity';
import { Profile } from '../../../user-management/domain/entities/profile.entity';
import { OrderStatus } from '../../domain/value-objects/booking-enums.vo';
import {
  CreateOrderDto,
  UpdateOrderDto,
  CancelOrderDto,
  OrderResponseDto,
} from '../dto/order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async create(customerId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId === customerId) {
      throw new BadRequestException('Cannot order your own service');
    }

    // Calculate fees (10% platform fee)
    const platformFeeRate = 0.1;
    const platformFee = service.price * platformFeeRate;
    const providerEarnings = service.price - platformFee;

    const orderNumber = this.generateOrderNumber();

    const order = this.orderRepository.create({
      ...dto,
      orderNumber,
      customerId,
      providerId: service.providerId,
      amount: service.price,
      currency: service.currency,
      platformFee,
      providerEarnings,
    });

    await this.orderRepository.save(order);

    // Create milestones if provided
    if (dto.milestones && dto.milestones.length > 0) {
      const milestones = dto.milestones.map((m, index) =>
        this.milestoneRepository.create({
          ...m,
          orderId: order.id,
          displayOrder: index + 1,
        }),
      );
      await this.milestoneRepository.save(milestones);
    }

    return this.findById(order.id, customerId);
  }

  async findById(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['service', 'milestones'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only customer or provider can view
    if (order.customerId !== userId && order.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const customerProfile = await this.profileRepository.findOne({
      where: { userId: order.customerId },
    });

    const providerProfile = await this.profileRepository.findOne({
      where: { userId: order.providerId },
    });

    return this.mapToResponseDto(order, customerProfile, providerProfile);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only customer can update
    if (order.customerId !== userId) {
      throw new ForbiddenException('Only the customer can update the order');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Can only update orders pending payment');
    }

    Object.assign(order, dto);
    await this.orderRepository.save(order);

    return this.findById(id, userId);
  }

  async markAsPaid(
    id: string,
    paymentReference: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.markAsPaid(paymentReference);
    await this.orderRepository.save(order);

    return this.findById(id, order.customerId);
  }

  async startWork(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.providerId !== userId) {
      throw new ForbiddenException('Only the provider can start work');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order must be paid to start work');
    }

    order.startWork();
    await this.orderRepository.save(order);

    return this.findById(id, userId);
  }

  async deliver(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.providerId !== userId) {
      throw new ForbiddenException('Only the provider can deliver the order');
    }

    if (!order.canDeliver()) {
      throw new BadRequestException('Order must be in progress to deliver');
    }

    order.deliver();
    await this.orderRepository.save(order);

    return this.findById(id, userId);
  }

  async complete(id: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Only the customer can complete the order');
    }

    if (!order.canComplete()) {
      throw new BadRequestException('Order must be delivered to complete');
    }

    order.complete();
    await this.orderRepository.save(order);

    // Increment service orders and update provider earnings
    await this.serviceRepository.increment({ id: order.serviceId }, 'totalOrders', 1);

    return this.findById(id, userId);
  }

  async cancel(
    id: string,
    userId: string,
    dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Both customer and provider can cancel
    if (order.customerId !== userId && order.providerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!order.canCancel()) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    order.cancel(dto.reason);
    await this.orderRepository.save(order);

    return this.findById(id, userId);
  }

  async getCustomerOrders(customerId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { customerId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });

    return orders.map(o => this.mapToResponseDto(o));
  }

  async getProviderOrders(providerId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { providerId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });

    return orders.map(o => this.mapToResponseDto(o));
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  private mapToResponseDto(
    order: Order,
    customerProfile?: Profile,
    providerProfile?: Profile,
  ): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      providerId: order.providerId,
      serviceId: order.serviceId,
      status: order.status,
      description: order.description,
      requirements: order.requirements,
      amount: order.amount,
      currency: order.currency,
      platformFee: order.platformFee,
      providerEarnings: order.providerEarnings,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
      deliveryDate: order.deliveryDate,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      refundAmount: order.refundAmount,
      refundedAt: order.refundedAt,
      service: order.service
        ? {
            id: order.service.id,
            title: order.service.title,
            slug: order.service.slug,
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
      milestones: order.milestones?.map(m => ({
        id: m.id,
        title: m.title,
        amount: m.amount,
        status: m.status,
        dueDate: m.dueDate,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
