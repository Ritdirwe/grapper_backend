import { registerAs } from '@nestjs/config';

const toBoolean = (value?: string): boolean => value === 'true';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export default registerAs('storage', () => {
  const endpoint = process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT;

  return {
    provider: process.env.STORAGE_PROVIDER || process.env.STORAGE_DRIVER || 'local',
    local: {
      uploadDir: process.env.UPLOAD_DIR || 'uploads',
      baseUrl: process.env.STORAGE_LOCAL_BASE_URL,
    },
    s3: {
      bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET,
      region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
      accessKey: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
      endpoint,
      forcePathStyle: toBoolean(process.env.AWS_S3_FORCE_PATH_STYLE),
      publicUrl: process.env.AWS_S3_PUBLIC_URL,
      signedUrlExpiresIn: toNumber(process.env.AWS_S3_SIGNED_URL_EXPIRES_IN, 3600),
    },
  };
});
