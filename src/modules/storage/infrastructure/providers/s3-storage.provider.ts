import { StorageProvider } from '../../domain/interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageProvider implements StorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: configService.get('storage.s3.region'),
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
    return `https://${this.bucket}.s3.${this.configService.get('storage.s3.region')}.amazonaws.com/${path}`;
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

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
