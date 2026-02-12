
import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GigService } from '../application/services/gig.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthUser } from '@shared/types/auth-user.type';

@ApiTags('Proposals')
@ApiBearerAuth()
@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalController {
  constructor(private readonly gigService: GigService) {}

  @Get('my-proposals')
  @ApiOperation({ summary: 'Get all proposals sent by current user' })
  async getMyProposals(@CurrentUser() user: AuthUser) {
    return this.gigService.getMyProposals(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proposal details by ID' })
  async getProposal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gigService.getProposal(id, user.id);
  }
}
