import * as dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env.local') });
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
export function databaseOptions(env: NodeJS.ProcessEnv = process.env): TypeOrmModuleOptions {
  const required = (key: string): string => {
    const value = env[key];
    if (!value?.trim()) throw new Error('Missing database configuration: ' + key);
    return value;
  };
  const port = Number(env.DB_PORT ?? '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT');
  if (env.DB_SSL !== undefined && !['true', 'false'].includes(env.DB_SSL)) throw new Error('DB_SSL must be true or false');
  return {
    type: 'postgres', host: required('DB_HOST'), port,
    username: required('DB_USER'), password: required('DB_PASSWORD'), database: required('DB_NAME'),
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    autoLoadEntities: true, synchronize: false, migrationsRun: false, dropSchema: false,
    retryAttempts: 1, connectTimeoutMS: 5000, logging: false,
    extra: { max: 5, statement_timeout: 5000 },
  };
}
