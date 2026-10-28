const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDestinationItinerary,
} = require('../dist/route-explorer/destination-itinerary');
const {
  destinationItineraryRequest,
} = require('../dist/route-explorer/explorer.validation');
const { ExplorerService } = require('../dist/route-explorer/explorer.service');
const request = {
  mode: 'driving',
  preference: 'recommended',
  points: [
    { latitude: 37.5, longitude: 127 },
    { latitude: 37.88, longitude: 127.73 },
  ],
  startDate: '2026-10-28',
  endDate: '2026-10-29',
  departureTime: '09:30',
  categoryIds: [],
};
const place = (id, contentTypeId, name = id) => ({
  id,
  name,
  address: '춘천시 실제 DB 후보 대역',
  latitude: 37.88 + Number(id.match(/\d+/)?.[0] || 0) / 10000,
  longitude: 127.73,
  contentTypeId,
  categoryName: null,
  distanceMeters: 100,
});
const candidates = {
  sights: Array.from({ length: 10 }, (_, i) => place(`sight${i}`, 12)),
  food: [
    ...Array.from({ length: 8 }, (_, i) => place(`food${i}`, 39)),
    place('cafe1', 39, '카페 하나'),
    place('cafe2', 39, '카페 둘'),
  ],
  themed: [],
  stays: [place('stay1', 32)],
};
const minutes = (clock) =>
  clock.split(':').reduce((h, m) => h * 60 + Number(m), 0);

test('a two-day trip has distinct destination visits on both dates after arrival', () => {
  const result = buildDestinationItinerary(
    request,
    { durationSeconds: 5400 },
    candidates,
  );
  assert.deepEqual(
    result.days.map((d) => d.date),
    ['2026-10-28', '2026-10-29'],
  );
  assert.equal(result.arrivalTime, '11:00');
  assert.ok(result.days[0].visits.length >= 4);
  assert.ok(result.days[1].visits.length >= 5);
  const visits = result.days.flatMap((d) => d.visits);
  assert.equal(new Set(visits.map((v) => v.place.id)).size, visits.length);
  assert.ok(result.days[1].visits.some((v) => v.kind === 'lunch'));
  assert.ok(result.days[1].visits.some((v) => v.kind === 'dinner'));
  for (const day of result.days)
    for (let i = 1; i < day.visits.length; i++)
      assert.ok(
        minutes(day.visits[i].time) >=
          minutes(day.visits[i - 1].endTime) + day.visits[i].travelMinutes,
      );
  assert.equal(result.stayOptions.length, 1);
});

test('late arrival does not schedule sightseeing before reaching the destination', () => {
  const result = buildDestinationItinerary(
    { ...request, departureTime: '23:00' },
    { durationSeconds: 10800 },
    candidates,
  );
  assert.equal(result.arrivalDate, '2026-10-29');
  assert.equal(result.arrivalTime, '02:00');
  assert.equal(result.days[0].visits.length, 0);
  assert.ok(result.days[1].visits.length > 0);
});

test('missing DB places never become fabricated sights, restaurants or hotels', () => {
  const result = buildDestinationItinerary(
    request,
    { durationSeconds: 5400 },
    { sights: [], food: [], themed: [], stays: [] },
  );
  assert.ok(
    result.days.every((d) => d.visits.length === 0 && d.notes.length > 0),
  );
  assert.equal(result.stayOptions.length, 0);
});

test('meal switches and configured times are respected', () => {
  const result = buildDestinationItinerary(
    {
      ...request,
      includeLunch: false,
      includeDinner: true,
      dinnerTime: '18:30',
    },
    { durationSeconds: 5400 },
    candidates,
  );
  for (const day of result.days) {
    assert.ok(!day.visits.some((v) => v.kind === 'lunch'));
    assert.ok(
      minutes(day.visits.find((v) => v.kind === 'dinner').time) >= 1110,
    );
  }
});

test('destination validation rejects invalid dates, overlong trips and unsupported transport', () => {
  assert.equal(destinationItineraryRequest(request).endDate, '2026-10-29');
  for (const patch of [
    { mode: 'transit' },
    { startDate: '2026-02-30' },
    { endDate: '2026-10-27' },
    { endDate: '2026-11-10' },
    { departureTime: '24:30' },
    { includeLunch: 'false' },
  ])
    assert.throws(() => destinationItineraryRequest({ ...request, ...patch }));
});

test('destination service queries near destination and preserves partial DB failures', async () => {
  const calls = [];
  const service = new ExplorerService(
    { route: async () => ({ durationSeconds: 5400 }) },
    {
      placesAroundSpot: async (center, filter) => {
        calls.push({ center, filter });
        if (filter.contentTypeIds.includes(32))
          throw Error('DB unavailable for lodging');
        return {
          places: filter.contentTypeIds.includes(39)
            ? candidates.food
            : candidates.sights,
          limited: false,
        };
      },
    },
  );
  const result = await service.destinationItinerary(request);
  assert.ok(
    calls.every((c) => c.center.latitude === request.points[1].latitude),
  );
  assert.ok(result.days[1].visits.length > 0);
  assert.ok(result.warnings.some((w) => w.includes('숙박')));
});

test('HTTP destination itinerary uses the shared API prefix and rejects invalid dates before queries', async (t) => {
  const { Test } = require('@nestjs/testing');
  const { configureApp } = require('../dist/configure-app');
  const {
    ExplorerController,
  } = require('../dist/route-explorer/explorer.controller');
  const {
    ExplorerRepository,
  } = require('../dist/route-explorer/explorer.repository');
  const {
    GeocodingProvider,
  } = require('../dist/route-explorer/geocoding.provider');
  let calls = 0;
  const module = await Test.createTestingModule({
    controllers: [ExplorerController],
    providers: [
      { provide: GeocodingProvider, useValue: {} },
      { provide: ExplorerRepository, useValue: {} },
      {
        provide: ExplorerService,
        useValue: {
          destinationItinerary: async (value) => {
            calls++;
            return buildDestinationItinerary(
              value,
              { durationSeconds: 5400 },
              candidates,
            );
          },
        },
      },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());
  const url = `http://127.0.0.1:${app.getHttpServer().address().port}/api/travel/destination-itinerary`;
  const post = (body) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const response = await post(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).days.length, 2);
  assert.equal((await post({ ...request, endDate: '2026-02-30' })).status, 400);
  assert.equal(calls, 1);
});
