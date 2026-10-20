import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database.config';
import { User } from '../users/entities/user.entity';
@Module({
  imports: [TypeOrmModule.forRootAsync({
    useFactory: () => ({ ...databaseOptions(), entities: [User] }),
  })],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
