const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ExplorerRepository,
  CANDIDATE_LIMIT,
} = require('../dist/route-explorer/explorer.repository');
const id = '12345678-1234-1234-1234-123456789abc';
const row = (distance = 100) => ({
  place_id: id,
  name: 'test',
  latitude: '37',
  longitude: '127',
  content_type_id: 12,
  distance_meters: distance,
});
const request = { categoryIds: [id], contentTypeIds: [12], radiusMeters: 1000 };
test('spot query filters exact radius in SQL before LIMIT and sends longitude first', async () => {
  let sql, params;
  const repository = new ExplorerRepository({
    query: async (s, p) => {
      sql = s;
      params = p;
      return [row(999.9)];
    },
  });
  const result = await repository.placesAroundSpot(
    { latitude: 37, longitude: 127 },
    { ...request, limit: 5 },
  );
  assert.deepEqual(params, [[id], [12], 127, 37, 1000, 6]);
  assert.ok(
    sql.includes('ST_MakePoint($3::double precision,$4::double precision)'),
  );
  assert.ok(sql.indexOf('ST_DWithin') < sql.indexOf('LIMIT'));
  assert.ok(sql.includes('ST_Distance'));
  assert.ok(sql.includes('p.location IS NOT NULL'));
  assert.equal(sql.includes(id), false);
  assert.equal(result.places[0].distanceMeters, 1000);
});
test('invalid DB distances are rejected, and no schema mutation occurs on lookup', async () => {
  const seen = [];
  const repository = new ExplorerRepository({
    query: async (sql) => {
      seen.push(sql);
      return [row(NaN), row(-1), row(1000.1), row(null), row(1000)];
    },
  });
  const result = await repository.placesAroundSpot(
    { latitude: 37, longitude: 127 },
    { ...request, limit: 10 },
  );
  assert.equal(result.places.length, 1);
  assert.equal(result.places[0].distanceMeters, 1000);
  assert.equal(
    seen.some((sql) => /CREATE|ALTER|UPDATE|DELETE/i.test(sql)),
    false,
  );
});
test('route database sort precedes candidate cap, and truncation stays explicit', async () => {
  let sql;
  const repository = new ExplorerRepository({
    query: async (s) => {
      sql = s;
      return Array.from({ length: CANDIDATE_LIMIT + 1 }, () => row(10.25));
    },
  });
  const coordinates = [
    [127, 37],
    [127.1, 37.1],
    [127.2, 37],
  ];
  const result = await repository.candidates(request, coordinates);
  assert.equal(result.places.length, CANDIDATE_LIMIT);
  assert.equal(result.limited, true);
  assert.equal(result.places[0].distanceToRouteMeters, 10.25);
  assert.ok(sql.includes('ORDER BY distance_meters ASC,p.place_id LIMIT'));
  assert.equal(sql.includes('BETWEEN'), false);
});
test('missing PostGIS or spatial schema is a safe explicit failure, never a silent fallback', async () => {
  let calls = 0;
  const repository = new ExplorerRepository({
    query: async () => {
      calls++;
      throw new Error('private connection details');
    },
  });
  await assert.rejects(
    repository.candidates(request, [
      [127, 37],
      [128, 38],
    ]),
    (e) =>
      e.getStatus() === 503 &&
      !JSON.stringify(e.getResponse()).includes('private'),
  );
  await assert.rejects(
    repository.placesAroundSpot(
      { latitude: 37, longitude: 127 },
      { ...request, limit: 5 },
    ),
    (e) => e.getStatus() === 503,
  );
  assert.equal(calls, 2);
});
