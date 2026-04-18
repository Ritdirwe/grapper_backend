import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const waitlistDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.WAITLIST_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.WAITLIST_DATABASE_PORT || process.env.DATABASE_PORT || '5432', 10) || 5432,
  username: process.env.WAITLIST_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
  password: process.env.WAITLIST_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.WAITLIST_DATABASE_NAME || 'gripper_waitlist',
  entities: [__dirname + '/../../contexts/waitlist/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations-waitlist/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const waitlistDataSource = new DataSource(waitlistDataSourceOptions);

export default waitlistDataSource;
