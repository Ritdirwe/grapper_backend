
import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GigService } from '../application/services/gig.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Proposals')
@ApiBearerAuth()
@Controller('proposals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProposalController {
  constructor(private readonly gigService: GigService) {}

  @Get('my-proposals')
  @ApiOperation({ summary: 'Get all proposals sent by current user' })
  @Permissions(PERMISSIONS.MARKETPLACE_PROPOSAL_READ_OWN)
  async getMyProposals(@CurrentUser() user: AuthUser) {
    return this.gigService.getMyProposals(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proposal details by ID' })
  @Permissions(PERMISSIONS.MARKETPLACE_PROPOSAL_READ_OWN)
  async getProposal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gigService.getProposal(id, user.id);
  }
}
