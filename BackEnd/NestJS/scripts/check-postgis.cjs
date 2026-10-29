// Explicit read-only integration check. Does not create the extension or modify data/schema.
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { createLaunch } = require('./start.cjs');
let stage = 'configuration';
async function check() {
  const { env } = createLaunch(process.argv[2] || 'production');
  const { databaseOptions } = require('../dist/database/database.config.js');
  const {
    ExplorerRepository,
  } = require('../dist/route-explorer/explorer.repository.js');
  const options = databaseOptions(env);
  const client = new Client({
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    database: options.database,
    ssl: options.ssl,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  try {
    stage = 'connection';
    await client.connect();
    await client.query('BEGIN READ ONLY');
    stage = 'schema';
    const {
      rows: [extension],
    } = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname='postgis'",
    );
    assert.ok(extension, 'PostGIS extension missing');
    const {
      rows: [column],
    } = await client.query(
      "SELECT udt_name,is_generated FROM information_schema.columns WHERE table_schema='public' AND table_name='places' AND column_name='location'",
    );
    assert.equal(column?.udt_name, 'geography');
    assert.equal(column?.is_generated, 'ALWAYS');
    const {
      rows: [index],
    } = await client.query(
      "SELECT i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='ix_places_location_gist'",
    );
    assert.equal(index?.indisvalid, true);
    const {
      rows: [sample],
    } = await client.query(
      'SELECT longitude,latitude,category_id,content_type_id FROM public.places WHERE is_active=true AND location IS NOT NULL ORDER BY place_id LIMIT 1',
    );
    assert.ok(sample, 'No active spatial place to validate');
    stage = 'spatial queries';
    const longitude = Number(sample.longitude),
      latitude = Number(sample.latitude);
    const repository = new ExplorerRepository({
      query: async (sql, values) => (await client.query(sql, values)).rows,
    });
    const filters = {
      categoryIds: [],
      contentTypeIds: [],
      radiusMeters: 1000,
      limit: 5,
    };
    const spot = await repository.placesAroundSpot(
      { latitude, longitude },
      filters,
    );
    assert.ok(spot.places.length);
    assert.ok(spot.places.every((p) => p.distanceMeters <= 1000));
    const routes = await repository.candidates(filters, [
      [longitude - 0.001, latitude],
      [longitude + 0.001, latitude],
    ]);
    assert.ok(routes.places.length);
    assert.ok(routes.places.every((p) => p.distanceToRouteMeters <= 1000));
    const filtered = await repository.placesAroundSpot(
      { latitude, longitude },
      {
        ...filters,
        contentTypeIds: [Number(sample.content_type_id)],
        categoryIds: sample.category_id ? [sample.category_id] : [],
      },
    );
    assert.ok(filtered.places.length);
    console.log(
      'PASS: PostGIS schema/index and real spot/route/category queries (' +
        env.APP_ENV +
        '); read only.',
    );
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}
check().catch((error) => {
  const reason = /timeout/i.test(error.message || '')
    ? 'connection timeout'
    : error.code && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : 'check failed';
  console.error(
    'PostGIS check failed at ' +
      stage +
      ' (' +
      reason +
      '). Verify environment, extension, location column, index and access.',
  );
  process.exitCode = 1;
});
