import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { TourIngestionModule } from './tour-ingestion.module';
import { TourIngestionService, IngestionRunError } from './tour-ingestion.service';
import { parseIngestionOptions } from './tour-ingestion.options';
import { TourApiError, tourConfig } from './tour-api.client';

export async function main(args = process.argv.slice(2)): Promise<void> {
  if (args.length === 1 && args[0] === '--help') {
    console.log('tour:ingest -- <local|dev|prod> [--mode initial|sync|festivals|detail|reference] [--region 26] [--district 380] [--content-type 12] [--page-size 20] [--max-pages 1] [--start-page 1] [--list-only] [--modified-since YYYYMMDD] [--content-id ID] [--event-start YYYYMMDD] [--event-end YYYYMMDD]');
    return;
  }
  const options = parseIngestionOptions(args);
  // Validate the key before attempting a database connection.
  tourConfig(process.env);
  const app = await NestFactory.createApplicationContext(TourIngestionModule, { logger: false, abortOnError: false });
  try {
    console.log(JSON.stringify(await app.get(TourIngestionService).run(options)));
  } finally { await app.close(); }
}

main().catch((error: unknown) => {
  if (error instanceof IngestionRunError) console.error(JSON.stringify(error.report));
  else if (error instanceof TourApiError) console.error(error.message);
  else if (error instanceof Error && /^(Invalid|Unsupported|Dates must|sync requires|detail requires|festivals requires|--)/.test(error.message)) console.error(error.message);
  else console.error('Tour ingestion could not start. Check database configuration, schema v2 and environment settings.');
  process.exitCode = 1;
});
