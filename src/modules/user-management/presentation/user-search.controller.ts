import { Controller, Post, Get, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserSearchService } from '../application/services/user-search.service';
import { CreateUserSearchDto, UserSearchResponseDto, UserSearchQueryDto } from '../application/dto/user-search.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../identity/domain/entities/user.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('User Searches')
@Controller('user/searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSearchController {
  constructor(private readonly userSearchService: UserSearchService) {}

  @Post()
  @ApiOperation({ summary: 'Save a user search query' })
  @ApiResponse({ status: 201, description: 'Search saved successfully' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateUserSearchDto,
  ): Promise<UserSearchResponseDto> {
    const search = await this.userSearchService.create(user.id, dto);
    return {
      id: search.id,
      query: search.query,
      searchType: search.searchType,
      resultCount: search.resultCount,
      createdAt: search.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user search history' })
  @ApiResponse({ status: 200, type: [UserSearchResponseDto] })
  async findByUser(
    @CurrentUser() user: User,
    @Query() query: UserSearchQueryDto,
  ): Promise<UserSearchResponseDto[]> {
    const searches = await this.userSearchService.findByUser(user.id, query);
    return searches.map(search => ({
      id: search.id,
      query: search.query,
      searchType: search.searchType,
      resultCount: search.resultCount,
      createdAt: search.createdAt,
    }));
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent unique search queries' })
  @ApiResponse({ status: 200, type: [String] })
  async getRecentSearches(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ): Promise<string[]> {
    return this.userSearchService.getRecentSearches(user.id, limit);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a search from history' })
  @ApiResponse({ status: 200, description: 'Search deleted' })
  async delete(
    @CurrentUser() user: User,
    @Body('id') id: string,
  ): Promise<void> {
    await this.userSearchService.delete(user.id, id);
  }
}
