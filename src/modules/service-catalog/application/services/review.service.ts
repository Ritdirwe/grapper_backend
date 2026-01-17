import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../domain/entities/review.entity';
import { Service } from '../../domain/entities/service.entity';
import { Profile } from '../../../user-management/domain/entities/profile.entity';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewResponseDto,
  RespondToReviewDto,
} from '../dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async create(reviewerId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    // Check if already reviewed
    const existing = await this.reviewRepository.findOne({
      where: { serviceId: dto.serviceId, reviewerId },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this service');
    }

    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Can't review own service
    if (service.providerId === reviewerId) {
      throw new ForbiddenException('You cannot review your own service');
    }

    const review = this.reviewRepository.create({
      ...dto,
      reviewerId,
      isVerifiedPurchase: !!dto.bookingId,
    });

    await this.reviewRepository.save(review);

    // Update service rating
    service.updateRating(dto.rating);
    await this.serviceRepository.save(service);

    return this.mapToResponseDto(review);
  }

  async update(
    reviewId: string,
    reviewerId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    // If rating changed, update service rating
    if (dto.rating && dto.rating !== review.rating) {
      const service = await this.serviceRepository.findOne({
        where: { id: review.serviceId },
      });

      if (service) {
        // Recalculate rating (remove old, add new)
        const totalRating = service.averageRating * service.totalReviews - review.rating + dto.rating;
        service.averageRating = totalRating / service.totalReviews;
        await this.serviceRepository.save(service);
      }
    }

    Object.assign(review, dto);
    await this.reviewRepository.save(review);

    return this.mapToResponseDto(review);
  }

  async delete(reviewId: string, reviewerId: string): Promise<{ message: string }> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    // Update service rating
    const service = await this.serviceRepository.findOne({
      where: { id: review.serviceId },
    });

    if (service && service.totalReviews > 0) {
      const totalRating = service.averageRating * service.totalReviews - review.rating;
      service.totalReviews -= 1;
      service.averageRating = service.totalReviews > 0 ? totalRating / service.totalReviews : 0;
      await this.serviceRepository.save(service);
    }

    await this.reviewRepository.remove(review);

    return { message: 'Review deleted successfully' };
  }

  async getServiceReviews(
    serviceId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ReviewResponseDto[]; total: number; averageRating: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { serviceId, isHidden: false },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const reviewerIds = reviews.map(r => r.reviewerId);
    const profiles = await this.profileRepository.find({
      where: reviewerIds.map(id => ({ userId: id })),
    });

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    return {
      data: reviews.map(r => this.mapToResponseDto(r, profileMap.get(r.reviewerId))),
      total,
      averageRating: service?.averageRating || 0,
    };
  }

  async respond(
    reviewId: string,
    providerId: string,
    dto: RespondToReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['service'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.service.providerId !== providerId) {
      throw new ForbiddenException('You can only respond to reviews of your own services');
    }

    review.respond(dto.response);
    await this.reviewRepository.save(review);

    return this.mapToResponseDto(review);
  }

  async markHelpful(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.markHelpful();
    await this.reviewRepository.save(review);

    return this.mapToResponseDto(review);
  }

  private mapToResponseDto(review: Review, profile?: Profile): ReviewResponseDto {
    return {
      id: review.id,
      serviceId: review.serviceId,
      reviewerId: review.reviewerId,
      bookingId: review.bookingId,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
      providerResponse: review.providerResponse,
      providerResponseAt: review.providerResponseAt,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount,
      isHidden: review.isHidden,
      reviewer: profile
        ? {
            id: profile.userId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          }
        : undefined,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
