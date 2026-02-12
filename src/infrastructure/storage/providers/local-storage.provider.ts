import { StorageProvider } from '../domain/interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    const configuredUploadDir = this.configService.get<string>('storage.local.uploadDir') || 'uploads';
    const normalizedUploadDir = configuredUploadDir.replace(/^\/+|\/+$/g, '');
    this.uploadDir = path.join(process.cwd(), normalizedUploadDir);

    const configuredBaseUrl = this.configService.get<string>('storage.local.baseUrl');
    const appUrl = this.configService.get<string>('app.appUrl', 'http://localhost:3000');
    this.baseUrl = (configuredBaseUrl || `${appUrl}/${normalizedUploadDir}`).replace(/\/+$/, '');

    this.ensureDir();
  }

  private async ensureDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, filePath: string, mimeType: string): Promise<string> {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    return `${this.baseUrl}/${filePath}`;
  }

  async update(file: Buffer, filePath: string, mimeType: string): Promise<string> {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    return `${this.baseUrl}/${filePath}`;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async getSignedUrl(filePath: string): Promise<string> {
    return `${this.baseUrl}/${filePath}`;
  }
}
