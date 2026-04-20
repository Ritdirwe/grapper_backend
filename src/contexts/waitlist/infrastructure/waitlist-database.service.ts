import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WaitlistEntry } from '../domain/entities/waitlist-entry.entity';
import { waitlistDataSourceOptions } from '@infrastructure/database/waitlist-data-source';

@Injectable()
export class WaitlistDatabaseService implements OnModuleDestroy {
  private dataSource?: DataSource;
  private initPromise?: Promise<DataSource>;

  async getRepository(): Promise<Repository<WaitlistEntry>> {
    const dataSource = await this.getDataSource();
    return dataSource.getRepository(WaitlistEntry);
  }

  private async getDataSource(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    return this.initPromise;
  }

  private async initialize(): Promise<DataSource> {
    const dataSource = new DataSource(waitlistDataSourceOptions);

    try {
      await dataSource.initialize();
      this.dataSource = dataSource;
      return dataSource;
    } catch (error) {
      this.initPromise = undefined;
      throw new ServiceUnavailableException('Waitlist database is unavailable');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
