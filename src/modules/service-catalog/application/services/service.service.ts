import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../../domain/entities/service.entity';
import { ServiceImage } from '../../domain/entities/service-image.entity';
import { Category } from '../../domain/entities/category.entity';
import { Profile } from '../../../user-management/domain/entities/profile.entity';
import { ServiceStatus } from '../../domain/value-objects/service-enums.vo';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
  ServiceResponseDto,
} from '../dto/service.dto';
import { CategoryService } from './category.service';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(ServiceImage)
    private serviceImageRepository: Repository<ServiceImage>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private categoryService: CategoryService,
  ) {}

  async create(providerId: string, dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const slug = this.generateSlug(dto.title);

    const service = this.serviceRepository.create({
      ...dto,
      providerId,
      slug,
      status: ServiceStatus.DRAFT,
    });

    await this.serviceRepository.save(service);
    await this.categoryService.incrementServiceCount(dto.categoryId);

    return this.mapToResponseDto(service);
  }

  async update(
    serviceId: string,
    providerId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId !== providerId) {
      throw new ForbiddenException('You can only edit your own services');
    }

    // Handle category change
    if (dto.categoryId && dto.categoryId !== service.categoryId) {
      await this.categoryService.decrementServiceCount(service.categoryId);
      await this.categoryService.incrementServiceCount(dto.categoryId);
    }

    // Update slug if title changes
    if (dto.title && dto.title !== service.title) {
      dto['slug'] = this.generateSlug(dto.title);
    }

    Object.assign(service, dto);
    await this.serviceRepository.save(service);

    return this.mapToResponseDto(service);
  }

  async findById(id: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Increment view count
    service.incrementViews();
    await this.serviceRepository.save(service);

    const images = await this.serviceImageRepository.find({
      where: { serviceId: id },
      order: { displayOrder: 'ASC' },
    });

    const profile = await this.profileRepository.findOne({
      where: { userId: service.providerId },
    });

    return this.mapToResponseDto(service, images, profile);
  }

  async findBySlug(slug: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { slug },
      relations: ['category'],
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.incrementViews();
    await this.serviceRepository.save(service);

    const images = await this.serviceImageRepository.find({
      where: { serviceId: service.id },
      order: { displayOrder: 'ASC' },
    });

    const profile = await this.profileRepository.findOne({
      where: { userId: service.providerId },
    });

    return this.mapToResponseDto(service, images, profile);
  }

  async search(query: ServiceQueryDto): Promise<{ data: ServiceResponseDto[]; total: number }> {
    const {
      search,
      categoryId,
      providerId,
      status,
      minPrice,
      maxPrice,
      minRating,
      location,
      isFeatured,
      page = 1,
      limit = 20,
      sortBy = 'newest',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const qb = this.serviceRepository.createQueryBuilder('service');

    // Only active services for public search
    if (!providerId) {
      qb.andWhere('service.status = :status', { status: ServiceStatus.ACTIVE });
    } else if (status) {
      qb.andWhere('service.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(service.title ILIKE :search OR service.description ILIKE :search OR service.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('service.category_id = :categoryId', { categoryId });
    }

    if (providerId) {
      qb.andWhere('service.provider_id = :providerId', { providerId });
    }

    if (minPrice !== undefined) {
      qb.andWhere('service.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('service.price <= :maxPrice', { maxPrice });
    }

    if (minRating !== undefined) {
      qb.andWhere('service.average_rating >= :minRating', { minRating });
    }

    if (location) {
      qb.andWhere('service.location ILIKE :location', { location: `%${location}%` });
    }

    if (isFeatured !== undefined) {
      qb.andWhere('service.is_featured = :isFeatured', { isFeatured });
    }

    // Sorting
    const sortColumn = {
      price: 'service.price',
      rating: 'service.average_rating',
      orders: 'service.total_orders',
      newest: 'service.created_at',
    }[sortBy];

    qb.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const total = await qb.getCount();
    const services = await qb.skip(skip).take(limit).getMany();

    return {
      data: services.map(s => this.mapToResponseDto(s)),
      total,
    };
  }

  async getProviderServices(providerId: string): Promise<ServiceResponseDto[]> {
    const services = await this.serviceRepository.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });

    return services.map(s => this.mapToResponseDto(s));
  }

  async publish(serviceId: string, providerId: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId !== providerId) {
      throw new ForbiddenException('You can only publish your own services');
    }

    service.status = ServiceStatus.ACTIVE;
    await this.serviceRepository.save(service);

    return this.mapToResponseDto(service);
  }

  async pause(serviceId: string, providerId: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId !== providerId) {
      throw new ForbiddenException('You can only pause your own services');
    }

    service.status = ServiceStatus.PAUSED;
    await this.serviceRepository.save(service);

    return this.mapToResponseDto(service);
  }

  async delete(serviceId: string, providerId: string): Promise<{ message: string }> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId !== providerId) {
      throw new ForbiddenException('You can only delete your own services');
    }

    await this.categoryService.decrementServiceCount(service.categoryId);
    await this.serviceRepository.remove(service);

    return { message: 'Service deleted successfully' };
  }

  async addImage(
    serviceId: string,
    providerId: string,
    imageUrl: string,
    caption?: string,
    isPrimary = false,
  ): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.providerId !== providerId) {
      throw new ForbiddenException('You can only add images to your own services');
    }

    // Get current max display order
    const maxOrder = await this.serviceImageRepository
      .createQueryBuilder('image')
      .where('image.service_id = :serviceId', { serviceId })
      .select('MAX(image.display_order)', 'max')
      .getRawOne();

    const image = this.serviceImageRepository.create({
      serviceId,
      imageUrl,
      caption,
      isPrimary,
      displayOrder: (maxOrder?.max || 0) + 1,
    });

    // If setting as primary, unset other primaries
    if (isPrimary) {
      await this.serviceImageRepository.update(
        { serviceId, isPrimary: true },
        { isPrimary: false },
      );
    }

    await this.serviceImageRepository.save(image);

    return this.findById(serviceId);
  }

  async removeImage(
    imageId: string,
    providerId: string,
  ): Promise<{ message: string }> {
    const image = await this.serviceImageRepository.findOne({
      where: { id: imageId },
      relations: ['service'],
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.service.providerId !== providerId) {
      throw new ForbiddenException('You can only remove images from your own services');
    }

    await this.serviceImageRepository.remove(image);

    return { message: 'Image removed successfully' };
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  private mapToResponseDto(
    service: Service,
    images?: ServiceImage[],
    profile?: Profile,
  ): ServiceResponseDto {
    return {
      id: service.id,
      providerId: service.providerId,
      categoryId: service.categoryId,
      title: service.title,
      slug: service.slug,
      description: service.description,
      shortDescription: service.shortDescription,
      price: service.price,
      currency: service.currency,
      pricingType: service.pricingType,
      deliveryType: service.deliveryType,
      durationHours: service.durationHours,
      durationDays: service.durationDays,
      status: service.status,
      tags: service.tags,
      features: service.features,
      requirements: service.requirements,
      faqs: service.faqs,
      coverImageUrl: service.coverImageUrl,
      averageRating: service.averageRating,
      totalReviews: service.totalReviews,
      totalOrders: service.totalOrders,
      viewCount: service.viewCount,
      isFeatured: service.isFeatured,
      isPromoted: service.isPromoted,
      location: service.location,
      serviceArea: service.serviceArea,
      images: images?.map(i => ({
        id: i.id,
        imageUrl: i.imageUrl,
        caption: i.caption,
        isPrimary: i.isPrimary,
      })),
      provider: profile
        ? {
            id: profile.userId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          }
        : undefined,
      category: service.category
        ? {
            id: service.category.id,
            name: service.category.name,
            slug: service.category.slug,
          }
        : undefined,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
