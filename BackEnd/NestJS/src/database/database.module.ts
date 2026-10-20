import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database.config';
@Module({ imports: [TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions() })] })
export class DatabaseModule {}
