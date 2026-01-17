import {
  Controller,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShareService } from '../application/services/share.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Social Shares')
@ApiBearerAuth()
@Controller('shares')
@UseGuards(JwtAuthGuard)
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a share' })
  @ApiResponse({ status: 204 })
  async deleteShare(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.shareService.deleteShare(id, user.id);
  }
}
