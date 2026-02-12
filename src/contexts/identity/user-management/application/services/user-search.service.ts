import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSearch } from '../../domain/entities/user-search.entity';
import { CreateUserSearchDto, UserSearchQueryDto } from '../dto/user-search.dto';

@Injectable()
export class UserSearchService {
  constructor(
    @InjectRepository(UserSearch)
    private readonly userSearchRepository: Repository<UserSearch>,
  ) {}

  async create(userId: string, dto: CreateUserSearchDto): Promise<UserSearch> {
    const search = this.userSearchRepository.create({
      userId,
      query: dto.query,
      searchType: dto.searchType || 'general',
      resultCount: dto.resultCount,
      metadata: dto.metadata,
    });

    return this.userSearchRepository.save(search);
  }

  async findByUser(userId: string, query: UserSearchQueryDto): Promise<UserSearch[]> {
    const qb = this.userSearchRepository.createQueryBuilder('search')
      .where('search.userId = :userId', { userId })
      .orderBy('search.createdAt', 'DESC');

    if (query.searchType) {
      qb.andWhere('search.searchType = :searchType', { searchType: query.searchType });
    }

    const limit = query.limit || 10;
    qb.take(limit);

    return qb.getMany();
  }

  async getRecentSearches(userId: string, limit: number = 10): Promise<string[]> {
    const searches = await this.userSearchRepository
      .createQueryBuilder('search')
      .select('DISTINCT ON (search.query) search.query', 'query')
      .where('search.userId = :userId', { userId })
      .orderBy('search.query')
      .addOrderBy('search.createdAt', 'DESC')
      .take(limit)
      .getRawMany();

    return searches.map(s => s.query);
  }

  async delete(userId: string, searchId: string): Promise<void> {
    await this.userSearchRepository.delete({ id: searchId, userId });
  }
}
