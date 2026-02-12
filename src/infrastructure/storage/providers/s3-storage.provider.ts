import { StorageProvider } from '../domain/interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageProvider implements StorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly publicUrl?: string;
  private readonly signedUrlExpiresIn: number;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('storage.s3.region');
    this.endpoint = this.configService.get('storage.s3.endpoint');
    this.publicUrl = this.configService.get('storage.s3.publicUrl');
    this.signedUrlExpiresIn = this.configService.get('storage.s3.signedUrlExpiresIn', 3600);

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: this.configService.get('storage.s3.forcePathStyle', false),
      credentials: {
        accessKeyId: configService.get('storage.s3.accessKey'),
        secretAccessKey: configService.get('storage.s3.secretKey'),
      },
    });
    this.bucket = configService.get('storage.s3.bucket');
  }

  async upload(file: Buffer, path: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
    return this.buildObjectUrl(path);
  }

  async update(file: Buffer, path: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
    return this.buildObjectUrl(path);
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.s3Client.send(command);
  }

  async getSignedUrl(path: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: this.signedUrlExpiresIn });
  }

  private buildObjectUrl(objectPath: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/+$/, '')}/${objectPath}`;
    }

    if (this.endpoint) {
      const base = this.endpoint.replace(/\/+$/, '');
      const forcePathStyle = this.configService.get('storage.s3.forcePathStyle', false);

      if (forcePathStyle) {
        return `${base}/${this.bucket}/${objectPath}`;
      }
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${objectPath}`;
  }
}
