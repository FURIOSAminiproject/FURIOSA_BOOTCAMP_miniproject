import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseOptions } from './database.config';
async function check() {
  const { autoLoadEntities, retryAttempts, ...options } = databaseOptions();
  const database = new DataSource(options as DataSourceOptions);
  try {
    await database.initialize();
    const [result] = await database.query('SELECT current_database() AS name');
    if (result.name !== process.env.DB_NAME) throw new Error('Unexpected database');
    console.log('Database connection verified (' + process.env.APP_ENV + '). No data changed.');
  } finally { if (database.isInitialized) await database.destroy(); }
}
check().catch((error: unknown) => {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error && /^(Missing database configuration:|Invalid DB_PORT|DB_SSL must)/.test(error.message)
    ? error.message : 'Database connection failed' + (code ? ' (' + code + ')' : '') + '. Check credentials and network access.';
  console.error(message);
  if (error instanceof Error && error.message.includes('pg_hba.conf')) console.error('PostgreSQL pg_hba.conf rejected this client connection. Check allowed client address and TLS policy.');
  process.exitCode = 1;
});
