import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const logger = new Logger('DatabaseModule');

        const host = (process.env.DB_HOST || 'localhost').trim();
        const port = parseInt((process.env.DB_PORT || '5432').trim(), 10);
        const username = (process.env.DB_USER || 'postgres').trim();
        const password = (process.env.DB_PASSWORD || '').trim();
        const database = (process.env.DB_NAME || 'postgres').trim();
        const ssl = (process.env.DB_SSL || '').trim() === 'true' ? { rejectUnauthorized: false } : false;

        logger.log(
          `PostgreSQL 연결 설정: host=${host}, port=${port}, user=${username}, database=${database}`,
        );

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          ssl,
          entities: [User],
          synchronize: process.env.DB_SYNCHRONIZE !== 'false', // Auto creates/updates tables in dev
          autoLoadEntities: true,
          retryAttempts: 3,
          retryDelay: 3000,
          logging: process.env.DB_LOGGING === 'true',
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
