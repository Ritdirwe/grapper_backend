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
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PERMISSIONS } from '@common/authz/permissions.enum';

@ApiTags('Social Shares')
@ApiBearerAuth()
@Controller('shares')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMUNITY_SHARE_DELETE_OWN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a share' })
  @ApiResponse({ status: 204 })
  async deleteShare(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.shareService.deleteShare(id, user.id);
  }
}
