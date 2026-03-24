import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PayoutRelease,
  PayoutReleaseMode,
  PayoutReleaseSourceType,
} from '../../domain/entities/payout-release.entity';
import {
  CreatePayoutReleaseDto,
  PayoutReleaseResponseDto,
} from '../dto/payout.dto';

@Injectable()
export class PayoutReleaseService {
  constructor(
    @InjectRepository(PayoutRelease)
    private readonly payoutReleaseRepository: Repository<PayoutRelease>,
    private readonly dataSource: DataSource,
  ) {}

  async createRelease(
    dto: CreatePayoutReleaseDto,
    releasedBy: string,
  ): Promise<PayoutReleaseResponseDto> {
    const sourceContext = await this.getSourceContext(dto.sourceType, dto.sourceId);

    if (!sourceContext) {
      throw new NotFoundException('Release source not found');
    }

    if (sourceContext.providerId !== dto.providerId) {
      throw new BadRequestException('Provider does not match source owner');
    }

    const alreadyReleased = await this.getAlreadyReleasedAmount(dto.sourceType, dto.sourceId);
    const remainingReleasable = sourceContext.maxReleasable - alreadyReleased;

    if (dto.amount > remainingReleasable) {
      throw new BadRequestException(
        `Release amount exceeds remaining releasable amount (${remainingReleasable.toFixed(2)})`,
      );
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Release amount must be greater than zero');
    }

    if (sourceContext.milestones.length > 0) {
      if (dto.releaseMode !== PayoutReleaseMode.MILESTONE) {
        throw new BadRequestException('Sources with milestones only allow milestone-based release');
      }

      if (!dto.milestoneId) {
        throw new BadRequestException('milestoneId is required for milestone releases');
      }

      const milestone = sourceContext.milestones.find((m) => m.id === dto.milestoneId);
      if (!milestone) {
        throw new BadRequestException('Milestone does not belong to source');
      }

      if (milestone.status !== 'approved') {
        throw new BadRequestException('Only approved milestones can be released');
      }

      if (Number(milestone.amount) !== Number(dto.amount)) {
        throw new BadRequestException('Milestone release amount must exactly match milestone amount');
      }

      const existingMilestoneRelease = await this.payoutReleaseRepository.findOne({
        where: {
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          milestoneId: dto.milestoneId,
        },
      });

      if (existingMilestoneRelease) {
        throw new BadRequestException('This milestone has already been released');
      }
    } else {
      if (dto.releaseMode !== PayoutReleaseMode.MANUAL) {
        throw new BadRequestException('Sources without milestones only allow manual release');
      }

      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Manual release requires a reason');
      }
    }

    const release = this.payoutReleaseRepository.create({
      providerId: dto.providerId,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      releaseMode: dto.releaseMode,
      milestoneId: dto.milestoneId,
      amount: dto.amount,
      currency: sourceContext.currency,
      progressPercent: dto.progressPercent,
      reason: dto.reason,
      releasedBy,
      metadata: {
        sourceStatus: sourceContext.status,
      },
    });

    await this.payoutReleaseRepository.save(release);
    return this.mapToResponse(release);
  }

  async listReleasesForProvider(providerId: string): Promise<PayoutReleaseResponseDto[]> {
    const releases = await this.payoutReleaseRepository.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
    return releases.map((release) => this.mapToResponse(release));
  }

  async listReleasesAdmin(filters?: {
    providerId?: string;
    sourceType?: PayoutReleaseSourceType;
    sourceId?: string;
  }): Promise<PayoutReleaseResponseDto[]> {
    const query = this.payoutReleaseRepository.createQueryBuilder('release');

    if (filters?.providerId) {
      query.andWhere('release.provider_id = :providerId', {
        providerId: filters.providerId,
      });
    }

    if (filters?.sourceType) {
      query.andWhere('release.source_type = :sourceType', {
        sourceType: filters.sourceType,
      });
    }

    if (filters?.sourceId) {
      query.andWhere('release.source_id = :sourceId', {
        sourceId: filters.sourceId,
      });
    }

    const releases = await query.orderBy('release.created_at', 'DESC').getMany();
    return releases.map((release) => this.mapToResponse(release));
  }

  async getReleasedTotalForProvider(providerId: string): Promise<number> {
    const result = await this.payoutReleaseRepository
      .createQueryBuilder('release')
      .where('release.provider_id = :providerId', { providerId })
      .select('COALESCE(SUM(release.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    return Number(result?.total || 0);
  }

  private async getAlreadyReleasedAmount(
    sourceType: PayoutReleaseSourceType,
    sourceId: string,
  ): Promise<number> {
    const result = await this.payoutReleaseRepository
      .createQueryBuilder('release')
      .where('release.source_type = :sourceType', { sourceType })
      .andWhere('release.source_id = :sourceId', { sourceId })
      .select('COALESCE(SUM(release.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    return Number(result?.total || 0);
  }

  private async getSourceContext(sourceType: PayoutReleaseSourceType, sourceId: string) {
    if (sourceType === PayoutReleaseSourceType.ORDER) {
      const rows = await this.dataSource.query(
        `SELECT id, provider_id, currency, provider_earnings, status, payment_status
         FROM orders
         WHERE id = $1
         LIMIT 1`,
        [sourceId],
      );

      const order = rows[0];
      if (!order) {
        return null;
      }

      if (['cancelled', 'refunded', 'disputed'].includes(order.status)) {
        throw new BadRequestException('Order is not eligible for payout release');
      }

      if (String(order.payment_status || '').toLowerCase() !== 'completed') {
        throw new BadRequestException('Order payment must be completed before release');
      }

      const milestones = await this.dataSource.query(
        `SELECT id, amount, status
         FROM milestones
         WHERE order_id = $1`,
        [sourceId],
      );

      return {
        providerId: order.provider_id as string,
        currency: (order.currency as string) || 'NGN',
        maxReleasable: Number(order.provider_earnings || 0),
        status: order.status as string,
        milestones: milestones.map((m: any) => ({
          id: m.id as string,
          amount: Number(m.amount || 0),
          status: String(m.status || '').toLowerCase(),
        })),
      };
    }

    if (sourceType === PayoutReleaseSourceType.BOOKING) {
      const rows = await this.dataSource.query(
        `SELECT id, provider_id, currency, amount, platform_fee, status, payment_status
         FROM bookings
         WHERE id = $1
         LIMIT 1`,
        [sourceId],
      );

      const booking = rows[0];
      if (!booking) {
        return null;
      }

      if (['cancelled', 'disputed'].includes(booking.status)) {
        throw new BadRequestException('Booking is not eligible for payout release');
      }

      if (String(booking.payment_status || '').toLowerCase() !== 'completed') {
        throw new BadRequestException('Booking payment must be completed before release');
      }

      const grossAmount = Number(booking.amount || 0);
      const platformFee = Number(booking.platform_fee || 0);
      const maxReleasable = Math.max(grossAmount - platformFee, 0);

      return {
        providerId: booking.provider_id as string,
        currency: (booking.currency as string) || 'NGN',
        maxReleasable,
        status: booking.status as string,
        milestones: [],
      };
    }

    throw new BadRequestException('Unsupported source type for release');
  }

  private mapToResponse(release: PayoutRelease): PayoutReleaseResponseDto {
    return {
      id: release.id,
      providerId: release.providerId,
      sourceType: release.sourceType,
      sourceId: release.sourceId,
      releaseMode: release.releaseMode,
      milestoneId: release.milestoneId,
      amount: Number(release.amount),
      currency: release.currency,
      progressPercent: release.progressPercent ? Number(release.progressPercent) : undefined,
      reason: release.reason,
      releasedBy: release.releasedBy,
      createdAt: release.createdAt,
    };
  }
}
