const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  GeocodingProvider,
} = require('../dist/route-explorer/geocoding.provider');
const { RouteProximity } = require('../dist/route-explorer/route-proximity');
const { ExplorerService } = require('../dist/route-explorer/explorer.service');
const {
  ExplorerRepository,
  CANDIDATE_LIMIT,
} = require('../dist/route-explorer/explorer.repository');
const {
  explorerRequest,
  searchQuery,
} = require('../dist/route-explorer/explorer.validation');
const { RoutingError } = require('../dist/routing-cache/routing.errors');

const id = '12345678-1234-1234-1234-123456789abc';
const point = (longitude, latitude) => ({ longitude, latitude });
const body = {
  mode: 'driving',
  points: [point(127, 37), point(128, 38)],
  contentTypeIds: [12],
  radiusMeters: 1000,
};
const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [127, 37] },
      properties: {
        gid: 'openstreetmap:venue:1',
        name: '<img src=x>',
        label: '서울, 대한민국',
      },
    },
  ],
};
const route = (preference, coordinates) => ({
  preference,
  mode: 'driving',
  geometry: { type: 'LineString', coordinates },
  distanceMeters: 1000,
  durationSeconds: 300,
});
const candidate = (name, longitude, latitude) => ({
  id: name,
  name,
  longitude,
  latitude,
  address: '',
  contentTypeId: 12,
  categoryName: null,
});

test('comparison validation rejects extra fields, invalid categories, radius and nonnumeric coordinates', () => {
  assert.equal(explorerRequest(body).limit, 10);
  assert.equal(searchQuery('  서울역  '), '서울역');
  for (const bad of [
    null,
    { ...body, points: [] },
    { ...body, apiKey: 'bad' },
    { ...body, contentTypeIds: ['12'] },
    { ...body, contentTypeIds: [99] },
    { ...body, categoryIds: ['not-a-uuid'] },
    { ...body, radiusMeters: 5001 },
    { ...body, limit: 21 },
    { ...body, points: [point('127', 37), point(128, 38)] },
  ])
    assert.throws(
      () => explorerRequest(bad),
      (error) => error.getStatus() === 400,
    );
  for (const query of ['', 'a', ['서울'], 'a\nb', 'a'.repeat(101)])
    assert.throws(() => searchQuery(query));
});

test('hosted Pelias search sends server Authorization, Korean country filter, deduplicates and expires cache', async () => {
  let calls = 0,
    now = 0;
  const provider = new GeocodingProvider(
    { ORS_API_KEY: 'test-only-key' },
    async (input, options) => {
      calls++;
      const url = new URL(input);
      assert.equal(
        url.origin + url.pathname,
        'https://api.heigit.org/pelias/v1/search',
      );
      assert.equal(url.searchParams.get('boundary.country'), 'KOR');
      assert.equal(url.searchParams.get('text'), '서울역');
      assert.equal(url.searchParams.has('api_key'), false);
      assert.equal(options.headers.Authorization, 'test-only-key');
      assert.equal(options.redirect, 'error');
      await new Promise((resolve) => setImmediate(resolve));
      return new Response(JSON.stringify(geojson));
    },
    () => now,
  );
  const [a, b] = await Promise.all([
    provider.search('서울역'),
    provider.search(' 서울역 '),
  ]);
  assert.equal(calls, 1);
  assert.equal(a[0].latitude, 37);
  assert.equal(a[0].longitude, 127);
  assert.equal(a[0].name, '<img src=x>'); // 문자열만 반환하며 HTML 처리는 UI에서 하지 않는다.
  a[0].name = 'changed';
  assert.notEqual(b[0].name, 'changed');
  assert.notEqual((await provider.search('서울역'))[0].name, 'changed');
  now = 3600001;
  await provider.search('서울역');
  assert.equal(calls, 2);
});

test('geocoder rejects invalid response and quota failures, and does not cache errors', async () => {
  let calls = 0;
  const provider = new GeocodingProvider(
    { ORS_API_KEY: 'test-only-key' },
    async () => {
      calls++;
      return new Response('{}', { status: calls === 1 ? 429 : 200 });
    },
  );
  await assert.rejects(
    provider.search('서울역'),
    (error) => error.getResponse().code === 'PROVIDER_QUOTA_EXCEEDED',
  );
  await assert.rejects(
    provider.search('서울역'),
    (error) => error.getResponse().code === 'PROVIDER_RESPONSE_INVALID',
  );
  assert.equal(calls, 2);
  const missing = new GeocodingProvider({}, async () => {
    throw new Error('must not call');
  });
  await assert.rejects(
    missing.search('서울역'),
    (error) => error.getResponse().code === 'PROVIDER_AUTH_ERROR',
  );
});

test('proximity includes middle of a long segment and excludes endpoint chord shortcuts', () => {
  const straight = new RouteProximity(
    [
      [127, 37],
      [128, 37],
    ],
    200,
  );
  assert.ok(Math.abs(straight.distance([127.5, 37.001]) - 111.2) < 1);
  const bent = new RouteProximity(
    [
      [127, 37],
      [127, 38],
      [128, 38],
    ],
    1000,
  );
  assert.ok(bent.distance([127, 37.5]) < 1);
  assert.ok(bent.distance([127.5, 37.5]) > 1000);
  const repeated = new RouteProximity(
    [
      [127, 37],
      [127, 37],
    ],
    200,
  );
  assert.equal(repeated.distance([127, 37]), 0);
});

test('each route gets its own nearby recommendations, ordered and limited by distance', async () => {
  const seen = [];
  const planner = {
    route: async (request) => {
      seen.push(request.preference);
      return route(
        request.preference,
        request.preference === 'recommended'
          ? [
              [127, 37],
              [128, 37],
            ]
          : [
              [127, 38],
              [128, 38],
            ],
      );
    },
  };
  const places = {
    candidates: async () => ({
      limited: false,
      places: [
        candidate('south', 127.5, 37.001),
        candidate('north', 127.5, 38.001),
        candidate('far', 130, 40),
        candidate('nearer', 127.5, 37),
      ],
    }),
  };
  const result = await new ExplorerService(planner, places).compare(
    explorerRequest({ ...body, limit: 1 }),
  );
  assert.deepEqual(seen.sort(), ['recommended', 'shortest']);
  assert.equal(result.routes[0].places[0].id, 'nearer');
  assert.equal(result.routes[1].places[0].id, 'north');
});

test('a failed route or DB recommendation does not erase another successful route', async () => {
  const planner = {
    route: async (request) => {
      if (request.preference === 'shortest')
        throw new RoutingError(422, 'ROUTE_NOT_FOUND', '경로 없음');
      return route(request.preference, [
        [127, 37],
        [128, 37],
      ]);
    },
  };
  const places = {
    candidates: async () => {
      throw new Error('private database details');
    },
  };
  const result = await new ExplorerService(planner, places).compare(
    explorerRequest(body),
  );
  assert.ok(result.routes[0].route);
  assert.equal(
    result.routes[0].recommendationError,
    '경로 주변 장소 추천을 처리하지 못했습니다.',
  );
  assert.equal(result.routes[1].route, null);
  assert.equal(result.routes[1].routeError, '경로 없음');
  await assert.rejects(
    new ExplorerService(
      {
        route: async () => {
          throw new RoutingError(503, 'PROVIDER_QUOTA_EXCEEDED', '한도');
        },
      },
      places,
    ).compare(explorerRequest(body)),
    (error) => error.getStatus() === 503,
  );
});

test('no category selection skips recommendations and candidate truncation is exposed', async () => {
  let called = false;
  const planner = {
    route: async (request) =>
      route(request.preference, [
        [127, 37],
        [128, 37],
      ]),
  };
  const places = {
    candidates: async () => {
      called = true;
      return { limited: true, places: [] };
    },
  };
  const service = new ExplorerService(planner, places);
  await service.compare(explorerRequest({ ...body, contentTypeIds: [] }));
  assert.equal(called, false);
  const result = await service.compare(explorerRequest(body));
  assert.equal(result.routes[0].candidateLimitReached, true);
});

test('place repository uses parameterized filters, active coordinates and safe candidate bounds', async () => {
  let query, params;
  const repository = new ExplorerRepository({
    query: async (sql, values) => {
      query = sql;
      params = values;
      return [
        {
          place_id: id,
          name: 'place',
          latitude: '37.1',
          longitude: '127.1',
          content_type_id: 12,
        },
        { place_id: id, name: 'broken', latitude: null, longitude: null },
      ];
    },
  });
  const request = explorerRequest({ ...body, categoryIds: [id] });
  const result = await repository.candidates(request, {
    minLat: 37,
    maxLat: 38,
    minLon: 127,
    maxLon: 128,
  });
  assert.deepEqual(params, [[id], [12], 37, 38, 127, 128, CANDIDATE_LIMIT + 1]);
  assert.ok(query.includes('p.is_active=true'));
  assert.ok(query.includes('WITH RECURSIVE'));
  assert.equal(query.includes(id), false);
  assert.equal(result.places.length, 1);
  assert.equal(result.places[0].latitude, 37.1);
});

test('HTTP search, category and comparison contracts work with provider and DB mocks', async () => {
  require('reflect-metadata');
  const { Test } = require('@nestjs/testing');
  const { configureApp } = require('../dist/configure-app');
  const {
    ExplorerController,
  } = require('../dist/route-explorer/explorer.controller');
  const planner = {
    route: async (request) =>
      route(request.preference, [
        [127, 37],
        [128, 37],
      ]),
  };
  const repository = {
    categories: async () => [{ id, name: '관광', level: 1, parentId: null }],
    candidates: async () => ({
      limited: false,
      places: [candidate('near', 127.5, 37)],
    }),
  };
  const module = await Test.createTestingModule({
    controllers: [ExplorerController],
    providers: [
      {
        provide: GeocodingProvider,
        useValue: {
          search: async (q) => {
            searchQuery(q);
            return [candidate('서울역', 127, 37)];
          },
        },
      },
      { provide: ExplorerRepository, useValue: repository },
      {
        provide: ExplorerService,
        useValue: new ExplorerService(planner, repository),
      },
    ],
  }).compile();
  const app = module.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const get = (path) => fetch(base + '/api' + path);
    assert.equal((await get('/map/search?q=a')).status, 400);
    const search = await get('/map/search?q=' + encodeURIComponent('서울역'));
    assert.equal(search.status, 200);
    assert.equal((await search.json()).places[0].name, '서울역');
    const categories = await (await get('/routes/categories')).json();
    assert.equal(categories.contentTypes.length, 7);
    assert.equal(categories.categories[0].id, id);
    const post = (input) =>
      fetch(base + '/api/routes/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    assert.equal((await post({ ...body, radiusMeters: 0 })).status, 400);
    const compared = await post(body);
    assert.equal(compared.status, 200);
    const result = await compared.json();
    assert.equal(result.routes.length, 2);
    assert.equal(result.routes[0].places[0].id, 'near');
    repository.categories = async () => {
      throw new Error('private SQL detail');
    };
    const degraded = await (await get('/routes/categories')).json();
    assert.equal(degraded.contentTypes.length, 7);
    assert.ok(degraded.warning);
    assert.equal(JSON.stringify(degraded).includes('private SQL'), false);
  } finally {
    await app.close();
  }
});
