
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../domain/entities/review.entity';
import { ReviewType } from '../../domain/entities/review.entity';
import { Service } from '@contexts/marketplace/service-catalog/domain/entities/service.entity';
import { Booking } from '@contexts/marketplace/booking/domain/entities/booking.entity';
import { BookingStatus } from '@contexts/marketplace/booking/domain/value-objects/booking-enums.vo';
import { CreateReviewDto, UpdateReviewDto } from '../dto/review.dto';
import { NotificationOrchestratorService } from '@contexts/community/notification/application/services/notification-orchestrator.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private notificationOrchestratorService: NotificationOrchestratorService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const service = await this.serviceRepository.findOne({ where: { id: dto.serviceId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const completedBooking = await this.bookingRepository.findOne({
      where: {
        serviceId: dto.serviceId,
        status: BookingStatus.COMPLETED,
      },
      order: { completedAt: 'DESC' },
    });

    if (!completedBooking) {
      throw new BadRequestException('You can only review a service after completing a booking');
    }

    const reviewType =
      completedBooking.customerId === userId
        ? ReviewType.CUSTOMER
        : completedBooking.providerId === userId
          ? ReviewType.PROVIDER
          : null;

    if (!reviewType) {
      throw new BadRequestException('You can only review bookings you participated in');
    }

    const existing = await this.reviewRepository.findOne({
        where: { userId, bookingId: completedBooking.id }
    });
    
    if (existing) {
        throw new BadRequestException('You have already reviewed this service');
    }

    const review = this.reviewRepository.create({
      ...dto,
      userId,
      bookingId: completedBooking.id,
      reviewType,
    } as Review);

    await this.reviewRepository.save(review);

    if (reviewType === ReviewType.CUSTOMER) {
      await this.updateServiceRating(dto.serviceId);
    }

    const recipientId = reviewType === ReviewType.CUSTOMER ? service.providerId : completedBooking.customerId;
    const title = reviewType === ReviewType.CUSTOMER ? (dto.rating >= 5 ? 'New 5-star review' : 'New review received') : 'Provider feedback received';
    const body = reviewType === ReviewType.CUSTOMER
      ? `${service.title} received a new review.`
      : `${service.title} received provider feedback.`;

    await this.notificationOrchestratorService.notifyReview(recipientId, title, body, {
      reviewId: review.id,
      serviceId: service.id,
      bookingId: completedBooking.id,
      rating: dto.rating,
    });

    return this.findOne(review.id);
  }

  async findAllByService(serviceId: string, page = 1, limit = 20): Promise<any> {
    const [data, total] = await this.reviewRepository.findAndCount({
      where: { serviceId, reviewType: ReviewType.CUSTOMER },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'service'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, userId: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    if (review.reviewType === ReviewType.PROVIDER) {
      throw new BadRequestException('Provider reviews are immutable');
    }

    Object.assign(review, dto);
    await this.reviewRepository.save(review);
    
    if (dto.rating) {
        await this.updateServiceRating(review.serviceId);
    }

    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewType === ReviewType.PROVIDER) {
      throw new BadRequestException('Provider reviews cannot be deleted');
    }

    if (review.userId !== userId) { // Add admin check if needed
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);
    await this.updateServiceRating(review.serviceId);
  }

  async respond(id: string, userId: string, response: string): Promise<Review> {
    const review = await this.findOne(id);

    if (review.reviewType === ReviewType.PROVIDER) {
      throw new BadRequestException('Provider reviews cannot be responded to');
    }
    
    // Perform check if user is the provider of the service
    const service = await this.serviceRepository.findOne({ where: { id: review.serviceId } });
    if (service.providerId !== userId) {
        throw new ForbiddenException('Only the service provider can respond to reviews');
    }

    review.response = response;
    const saved = await this.reviewRepository.save(review);

    await this.notificationOrchestratorService.notifyReview(
      review.userId,
      'Provider responded to your review',
      `The provider responded to your review for ${service.title}.`,
      {
        reviewId: review.id,
        serviceId: review.serviceId,
      },
    );

    return saved;
  }

  async markHelpful(id: string, userId: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    
    if (review.userId === userId) {
        throw new BadRequestException('Cannot mark your own review as helpful');
    }

    if (review.helpfulUserIds.includes(userId)) {
        return review; // Already marked
    }

    review.helpfulUserIds.push(userId);
    review.helpfulCount += 1;
    
    return this.reviewRepository.save(review);
  }
  
  async getReviewsReceived(userId: string, page = 1, limit = 20): Promise<any> {
      // Find all services by this user
      const services = await this.serviceRepository.find({ where: { providerId: userId }, select: ['id'] });
      const serviceIds = services.map(s => s.id);
      
      if (serviceIds.length === 0) {
          return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      
      const [data, total] = await this.reviewRepository.createQueryBuilder('review')
        .where('review.serviceId IN (:...ids)', { ids: serviceIds })
        .andWhere('review.reviewType = :reviewType', { reviewType: ReviewType.CUSTOMER })
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.service', 'service')
        .orderBy('review.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
          data,
          meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
          }
      };
  }

  async getMyReviews(userId: string, page = 1, limit = 20): Promise<any> {
    const [data, total] = await this.reviewRepository.findAndCount({
      where: { userId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async updateServiceRating(serviceId: string) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .where('review.serviceId = :serviceId', { serviceId })
      .andWhere('review.reviewType = :reviewType', { reviewType: ReviewType.CUSTOMER })
      .select('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'count')
      .getRawOne();
      
    const avgRating = parseFloat(result.avgRating) || 0;
    const totalReviews = parseInt(result.count) || 0;
    
    await this.serviceRepository.update(serviceId, {
        averageRating: avgRating,
        totalReviews: totalReviews
    });
  }
}
