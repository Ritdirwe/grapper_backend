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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { User } from '../../identity/domain/entities/user.entity';
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
  @UseGuards(JwtAuthGuard)
  @Get('my-services')
  @ApiOperation({ summary: 'Get services owned by the current provider' })
  @ApiResponse({ status: 200, type: [ServiceResponseDto] })
  async getMyServices(@CurrentUser() user: User): Promise<ServiceResponseDto[]> {
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
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async publish(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.publish(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async pause(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto> {
    return this.serviceService.pause(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a service' })
  @ApiResponse({ status: 200 })
  async delete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.serviceService.delete(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  @ApiOperation({ summary: 'Add an image to a service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async addImage(
    @CurrentUser() user: User,
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
  @UseGuards(JwtAuthGuard)
  @Delete('images/:imageId')
  @ApiOperation({ summary: 'Remove an image from a service' })
  @ApiResponse({ status: 200 })
  async removeImage(
    @CurrentUser() user: User,
    @Param('imageId') imageId: string,
  ): Promise<{ message: string }> {
    return this.serviceService.removeImage(imageId, user.id);
  }
}
