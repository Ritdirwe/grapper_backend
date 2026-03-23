
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
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Gigs & Proposals')
@ApiBearerAuth()
@Controller('gigs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GigController {
  constructor(private readonly gigService: GigService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new gig' })
  @Permissions(PERMISSIONS.MARKETPLACE_GIG_CREATE_OWN)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateGigDto) {
    return this.gigService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all gigs (with filters)' })
  @Permissions(PERMISSIONS.MARKETPLACE_GIG_READ)
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
  @Permissions(PERMISSIONS.MARKETPLACE_GIG_READ)
  async findOne(@Param('id') id: string) {
    return this.gigService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a gig' })
  @Permissions(PERMISSIONS.MARKETPLACE_GIG_UPDATE_OWN)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGigDto,
  ) {
    return this.gigService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gig' })
  @Permissions(PERMISSIONS.MARKETPLACE_GIG_DELETE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gigService.delete(id, user.id);
  }

  @Post(':id/proposals')
  @ApiOperation({ summary: 'Submit a proposal for a gig' })
  @Permissions(PERMISSIONS.MARKETPLACE_PROPOSAL_CREATE_OWN)
  async submitProposal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.gigService.submitProposal(id, user.id, dto);
  }
}
