import { registerAs } from '@nestjs/config';

export default registerAs('waitlistDatabase', () => ({
  type: 'postgres',
  host: process.env.WAITLIST_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.WAITLIST_DATABASE_PORT || process.env.DATABASE_PORT || '5432', 10) || 5432,
  username: process.env.WAITLIST_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
  password: process.env.WAITLIST_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.WAITLIST_DATABASE_NAME || 'gripper_waitlist',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
}));
