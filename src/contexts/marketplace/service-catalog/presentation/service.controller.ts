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
import { ServiceService } from '../application/services/service.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
  ServiceResponseDto,
} from '../application/dto/service.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthUser } from '@shared/types/auth-user.type';
import { PERMISSIONS } from '@common/authz/permissions.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

class AddServiceImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  imageUrl: string;
  @ApiProperty({ example: 'Front view', required: false })
  caption?: string;
  @ApiProperty({ example: true, required: false })
  isPrimary?: boolean;
}

@ApiTags('Marketplace Services')
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search and filter services' })
  @ApiResponse({ status: 200, type: [ServiceResponseDto] })
  async search(@Query() query: ServiceQueryDto) {
    return this.serviceService.search(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('my-services')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_READ_OWN)
  @ApiOperation({ summary: 'Get services owned by the current provider' })
  @ApiResponse({ status: 200, type: [ServiceResponseDto] })
  async getMyServices(@CurrentUser() user: AuthUser): Promise<ServiceResponseDto[]> {
    return this.serviceService.getProviderServices(user.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get service details by ID' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async findById(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.serviceService.findById(id);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get service details by slug' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async findBySlug(@Param('slug') slug: string): Promise<ServiceResponseDto> {
    return this.serviceService.findBySlug(slug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_CREATE_OWN)
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_UPDATE_OWN)
  @ApiOperation({ summary: 'Update an existing service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/publish')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_PUBLISH_OWN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.publish(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/pause')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_PAUSE_OWN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async pause(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.pause(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_DELETE_OWN)
  @ApiOperation({ summary: 'Soft delete a service' })
  @ApiResponse({ status: 200 })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.serviceService.delete(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/images')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_IMAGE_ADD_OWN)
  @ApiOperation({ summary: 'Add an image to a service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async addImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AddServiceImageDto,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.addImage(
      id,
      user.id,
      body.imageUrl,
      body.caption,
      body.isPrimary,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('images/:imageId')
  @Permissions(PERMISSIONS.MARKETPLACE_SERVICE_IMAGE_DELETE_OWN)
  @ApiOperation({ summary: 'Remove an image from a service' })
  @ApiResponse({ status: 200 })
  async removeImage(
    @CurrentUser() user: AuthUser,
    @Param('imageId') imageId: string,
  ): Promise<{ message: string }> {
    return this.serviceService.removeImage(imageId, user.id);
  }
}
