import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminUserService } from '../application/services/admin-user.service';
import {
  AdminUpdateUserDto,
  AdminUpdateProfileDto,
  AdminUserListQueryDto,
  AdminUserResponseDto,
} from '../application/dto/admin-user.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/value-objects/user-role.vo';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async getAllUsers(
    @Query() query: AdminUserListQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    return this.adminUserService.getAllUsers(query);
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.getUserById(userId);
  }

  @Put(':userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.updateUser(userId, dto);
  }

  @Put(':userId/profile')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateProfileDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.updateProfile(userId, dto);
  }

  @Post(':userId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.suspendUser(userId);
  }

  @Post(':userId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.banUser(userId);
  }

  @Post(':userId/activate')
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.activateUser(userId);
  }

  @Post(':userId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyProfile(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.verifyProfile(userId);
  }

  @Post(':userId/reject-verification')
  @HttpCode(HttpStatus.OK)
  async rejectVerification(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.rejectVerification(userId);
  }

  @Post(':userId/strikes/add')
  @HttpCode(HttpStatus.OK)
  async addStrike(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.addStrike(userId);
  }

  @Post(':userId/strikes/remove')
  @HttpCode(HttpStatus.OK)
  async removeStrike(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.removeStrike(userId);
  }

  @Post(':userId/strikes/reset')
  @HttpCode(HttpStatus.OK)
  async resetStrikes(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.resetStrikes(userId);
  }

  @Post(':userId/toggle-featured')
  @HttpCode(HttpStatus.OK)
  async toggleFeatured(@Param('userId') userId: string): Promise<AdminUserResponseDto> {
    return this.adminUserService.toggleFeatured(userId);
  }
}
