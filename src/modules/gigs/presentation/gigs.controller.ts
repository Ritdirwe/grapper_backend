
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GigService } from '../application/services/gig.service';
import { CreateGigDto, UpdateGigDto, CreateProposalDto } from '../application/dto/gig.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';

@ApiTags('Gigs & Proposals')
@ApiBearerAuth()
@Controller('gigs')
@UseGuards(JwtAuthGuard)
export class GigController {
  constructor(private readonly gigService: GigService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new gig' })
  async create(@CurrentUser() user: User, @Body() dto: CreateGigDto) {
    return this.gigService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all gigs (with filters)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.gigService.findAll({ category }, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a gig by ID' })
  async findOne(@Param('id') id: string) {
    return this.gigService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a gig' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateGigDto,
  ) {
    return this.gigService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gig' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.gigService.delete(id, user.id);
  }

  @Post(':id/proposals')
  @ApiOperation({ summary: 'Submit a proposal for a gig' })
  async submitProposal(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.gigService.submitProposal(id, user.id, dto);
  }
}
