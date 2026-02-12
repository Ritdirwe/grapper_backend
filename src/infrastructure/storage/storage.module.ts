import { Module, Global } from '@nestjs/common';
import { StorageService } from './application/services/storage.service';
import { StorageController } from './presentation/storage.controller';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Global()
@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get('storage.provider', 'local');
        return provider === 's3' 
          ? new S3StorageProvider(configService)
          : new LocalStorageProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
