import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
