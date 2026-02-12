import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Category } from '../../domain/entities/category.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from '../dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: TreeRepository<Category>,
  ) {}

  async findAll(includeInactive = false): Promise<CategoryResponseDto[]> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (!includeInactive) {
      queryBuilder.where('category.is_active = :isActive', { isActive: true });
    }

    const categories = await queryBuilder
      .orderBy('category.display_order', 'ASC')
      .getMany();

    return categories.map(c => this.mapToResponseDto(c));
  }

  async findTree(): Promise<CategoryResponseDto[]> {
    const trees = await this.categoryRepository.findTrees();
    return trees.map(c => this.mapToResponseDtoWithChildren(c));
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const category = this.categoryRepository.create(dto);

    if (dto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: dto.parentId },
      });
      if (parent) {
        category.parent = parent;
      }
    }

    await this.categoryRepository.save(category);

    return this.mapToResponseDto(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    Object.assign(category, dto);
    await this.categoryRepository.save(category);

    return this.mapToResponseDto(category);
  }

  async delete(id: string): Promise<{ message: string }> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.serviceCount > 0) {
      throw new ConflictException('Cannot delete category with services');
    }

    await this.categoryRepository.remove(category);

    return { message: 'Category deleted successfully' };
  }

  async incrementServiceCount(categoryId: string): Promise<void> {
    await this.categoryRepository.increment({ id: categoryId }, 'serviceCount', 1);
  }

  async decrementServiceCount(categoryId: string): Promise<void> {
    await this.categoryRepository.decrement({ id: categoryId }, 'serviceCount', 1);
  }

  private mapToResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconUrl: category.iconUrl,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      displayOrder: category.displayOrder,
      serviceCount: category.serviceCount,
      parentId: category.parentId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private mapToResponseDtoWithChildren(category: Category): CategoryResponseDto {
    return {
      ...this.mapToResponseDto(category),
      children: category.children?.map(c => this.mapToResponseDtoWithChildren(c)),
    };
  }
}
