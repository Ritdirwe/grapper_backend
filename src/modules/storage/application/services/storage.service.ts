import { Injectable, Inject } from '@nestjs/common';
import { StorageProvider } from '../../domain/interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly provider: StorageProvider,
  ) {}

  async uploadFile(file: Buffer, path: string, mimeType: string): Promise<string> {
    return this.provider.upload(file, path, mimeType);
  }

  async deleteFile(path: string): Promise<void> {
    return this.provider.delete(path);
  }

  async getUrl(path: string): Promise<string> {
    return this.provider.getSignedUrl(path);
  }
}
