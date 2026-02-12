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
} from '@nestjs/common';
import { CategoryService } from '../application/services/category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from '../application/dto/category.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { UserRole } from '@contexts/identity/domain/value-objects/user-role.vo';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Service Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Whether to include inactive categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<CategoryResponseDto[]> {
    return this.categoryService.findAll(includeInactive === 'true');
  }

  @Public()
  @Get('tree')
  @ApiOperation({ summary: 'Get category tree hierarchy' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async findTree(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findTree();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async findById(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoryService.findById(id);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoryService.findBySlug(slug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoryService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing category (Admin only)' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiResponse({ status: 200 })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    return this.categoryService.delete(id);
  }
}
