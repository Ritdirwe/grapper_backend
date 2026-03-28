import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { AuthUser } from '@shared/types/auth-user.type';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketMessage } from '../../domain/entities/support-ticket-message.entity';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketSenderRole,
  SupportTicketStatus,
} from '../../domain/value-objects/support-ticket-enums.vo';
import {
  AddSupportTicketMessageDto,
  CreateSupportTicketDto,
  SupportTicketDetailResponseDto,
  SupportTicketListResponseDto,
  SupportTicketQueryDto,
  SupportTicketResponseDto,
  UpdateSupportTicketStatusDto,
} from '../dto/support-ticket.dto';

@Injectable()
export class SupportTicketService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportTicketMessage)
    private readonly supportTicketMessageRepository: Repository<SupportTicketMessage>,
    private readonly dataSource: DataSource,
  ) {}

  async createTicket(user: AuthUser, dto: CreateSupportTicketDto): Promise<SupportTicketDetailResponseDto> {
    await this.validateTargetReference(dto.category, dto.targetId);

    const ticket = this.supportTicketRepository.create({
      ticketNumber: this.generateTicketNumber(),
      creatorId: user.id,
      category: dto.category,
      targetId: dto.targetId,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      priority: dto.priority ?? SupportTicketPriority.NORMAL,
      status: SupportTicketStatus.OPEN,
      lastReplyAt: new Date(),
    });

    const savedTicket = await this.supportTicketRepository.save(ticket);

    const message = this.supportTicketMessageRepository.create({
      ticketId: savedTicket.id,
      senderId: user.id,
      senderRole: this.getSenderRoleFromUser(user),
      message: dto.description.trim(),
      attachments: [],
      isInternalNote: false,
    });
    await this.supportTicketMessageRepository.save(message);

    return this.getTicketDetailForAdmin(savedTicket.id, false);
  }

  async listMyTickets(userId: string, query: SupportTicketQueryDto): Promise<SupportTicketListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { creatorId: userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.subject = ILike(`%${query.search.trim()}%`);
    }

    const [tickets, total] = await this.supportTicketRepository.findAndCount({
      where,
      order: {
        lastReplyAt: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      tickets: tickets.map((ticket) => this.toTicketResponse(ticket)),
      total,
    };
  }

  async getMyTicketDetail(userId: string, ticketId: string): Promise<SupportTicketDetailResponseDto> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.creatorId !== userId) {
      throw new ForbiddenException('You are not allowed to access this ticket');
    }

    return this.getTicketDetail(ticketId, false);
  }

  async addMessageAsUser(
    user: AuthUser,
    ticketId: string,
    dto: AddSupportTicketMessageDto,
  ): Promise<SupportTicketDetailResponseDto> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.creatorId !== user.id) {
      throw new ForbiddenException('You are not allowed to reply on this ticket');
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Closed tickets cannot accept new replies');
    }

    const message = this.supportTicketMessageRepository.create({
      ticketId: ticket.id,
      senderId: user.id,
      senderRole: this.getSenderRoleFromUser(user),
      message: dto.message.trim(),
      attachments: dto.attachments ?? [],
      isInternalNote: false,
    });
    await this.supportTicketMessageRepository.save(message);

    ticket.lastReplyAt = new Date();
    if (ticket.status === SupportTicketStatus.AWAITING_USER || ticket.status === SupportTicketStatus.RESOLVED) {
      ticket.status = SupportTicketStatus.UNDER_REVIEW;
      ticket.closedAt = null;
    }
    await this.supportTicketRepository.save(ticket);

    return this.getTicketDetail(ticket.id, false);
  }

  async listAdminTickets(query: SupportTicketQueryDto): Promise<SupportTicketListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.supportTicketRepository
      .createQueryBuilder('ticket')
      .orderBy('ticket.last_reply_at', 'DESC', 'NULLS LAST')
      .addOrderBy('ticket.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('ticket.category = :category', { category: query.category });
    }

    if (query.search?.trim()) {
      qb.andWhere('(ticket.subject ILIKE :search OR ticket.ticket_number ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    const [tickets, total] = await qb.getManyAndCount();

    return {
      tickets: tickets.map((ticket) => this.toTicketResponse(ticket)),
      total,
    };
  }

  async getTicketDetailForAdmin(
    ticketId: string,
    includeInternalNotes = true,
  ): Promise<SupportTicketDetailResponseDto> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.getTicketDetail(ticket.id, includeInternalNotes);
  }

  async addMessageAsAdmin(
    adminId: string,
    ticketId: string,
    dto: AddSupportTicketMessageDto,
  ): Promise<SupportTicketDetailResponseDto> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isInternalNote = Boolean(dto.isInternalNote);

    const message = this.supportTicketMessageRepository.create({
      ticketId: ticket.id,
      senderId: adminId,
      senderRole: SupportTicketSenderRole.ADMIN,
      message: dto.message.trim(),
      attachments: dto.attachments ?? [],
      isInternalNote,
    });
    await this.supportTicketMessageRepository.save(message);

    ticket.lastReplyAt = new Date();
    if (!isInternalNote && ticket.status !== SupportTicketStatus.CLOSED) {
      ticket.status = SupportTicketStatus.AWAITING_USER;
      ticket.closedAt = null;
    }
    await this.supportTicketRepository.save(ticket);

    return this.getTicketDetail(ticket.id, true);
  }

  async updateTicketStatus(ticketId: string, dto: UpdateSupportTicketStatusDto): Promise<SupportTicketResponseDto> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.status = dto.status;
    ticket.closedAt =
      dto.status === SupportTicketStatus.RESOLVED || dto.status === SupportTicketStatus.CLOSED
        ? new Date()
        : null;
    const saved = await this.supportTicketRepository.save(ticket);

    return this.toTicketResponse(saved);
  }

  private async getTicketDetail(
    ticketId: string,
    includeInternalNotes: boolean,
  ): Promise<SupportTicketDetailResponseDto> {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const qb = this.supportTicketMessageRepository
      .createQueryBuilder('message')
      .where('message.ticket_id = :ticketId', { ticketId })
      .orderBy('message.created_at', 'ASC');

    if (!includeInternalNotes) {
      qb.andWhere('message.is_internal_note = false');
    }

    const messages = await qb.getMany();

    return {
      ticket: this.toTicketResponse(ticket),
      messages: messages.map((message) => ({
        id: message.id,
        senderRole: message.senderRole,
        senderId: message.senderId,
        message: message.message,
        attachments: message.attachments,
        isInternalNote: message.isInternalNote,
        createdAt: message.createdAt,
      })),
    };
  }

  private toTicketResponse(ticket: SupportTicket): SupportTicketResponseDto {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      category: ticket.category,
      targetId: ticket.targetId,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      creatorId: ticket.creatorId,
      lastReplyAt: ticket.lastReplyAt,
      closedAt: ticket.closedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private async validateTargetReference(
    category: SupportTicketCategory,
    targetId?: string,
  ): Promise<void> {
    if (category === SupportTicketCategory.OTHER) {
      return;
    }

    if (!targetId) {
      throw new BadRequestException('targetId is required for payment, order, or service complaints');
    }

    if (category === SupportTicketCategory.ORDER) {
      const result = await this.dataSource.query('SELECT id FROM orders WHERE id = $1 LIMIT 1', [targetId]);
      if (!result.length) {
        throw new BadRequestException('Order target does not exist');
      }
      return;
    }

    if (category === SupportTicketCategory.SERVICE) {
      const result = await this.dataSource.query('SELECT id FROM services WHERE id = $1 LIMIT 1', [targetId]);
      if (!result.length) {
        throw new BadRequestException('Service target does not exist');
      }
      return;
    }

    if (category === SupportTicketCategory.PAYMENT) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        targetId,
      );

      const result = isUuid
        ? await this.dataSource.query(
            'SELECT id FROM transactions WHERE id = $1 OR reference = $1 LIMIT 1',
            [targetId],
          )
        : await this.dataSource.query(
            'SELECT id FROM transactions WHERE reference = $1 LIMIT 1',
            [targetId],
          );

      if (!result.length) {
        throw new BadRequestException('Payment target does not exist');
      }
    }
  }

  private generateTicketNumber(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `TKT-${stamp}-${random}`;
  }

  private getSenderRoleFromUser(user: AuthUser): SupportTicketSenderRole {
    const normalizedRoles = [user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (normalizedRoles.includes('admin')) {
      return SupportTicketSenderRole.ADMIN;
    }

    if (normalizedRoles.includes('provider')) {
      return SupportTicketSenderRole.PROVIDER;
    }

    return SupportTicketSenderRole.USER;
  }
}
