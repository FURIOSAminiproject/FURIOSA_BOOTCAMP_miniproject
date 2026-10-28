const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDestinationItinerary,
  parseCuratedDays,
} = require('../dist/route-explorer/destination-itinerary');
const {
  destinationItineraryRequest,
} = require('../dist/route-explorer/explorer.validation');
const { ExplorerService } = require('../dist/route-explorer/explorer.service');
const {
  DestinationCurator,
} = require('../dist/route-explorer/destination-curator');
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

test('curator can prioritize real candidates while invalid IDs and arrival limits stay guarded', () => {
  const result = buildDestinationItinerary(
    request,
    { durationSeconds: 5400 },
    candidates,
    [],
    [
      {
        date: '2026-10-28',
        title: '호수와 미식의 첫날',
        placeIds: ['invented-place', 'sight7', 'food7'],
      },
    ],
  );
  assert.equal(result.days[0].title, '호수와 미식의 첫날');
  assert.ok(result.days[0].visits.some((visit) => visit.place.id === 'sight7'));
  assert.ok(
    result.days[0].visits.every((visit) => visit.place.id !== 'invented-place'),
  );
  assert.ok(
    result.days[0].visits.every((visit) => minutes(visit.time) >= 11 * 60),
  );
  const ids = result.days.flatMap((day) =>
    day.visits.map((visit) => visit.place.id),
  );
  assert.equal(new Set(ids).size, ids.length);
});

test('curator output accepts only itinerary dates and registered place IDs', () => {
  const choices = parseCuratedDays(
    [
      {
        date: '2026-10-28',
        title: '호수 여행',
        placeIds: ['sight7', 'fake', 'sight7'],
      },
      { date: '2026-10-28', title: '중복', placeIds: ['food1'] },
      { date: '2026-11-10', title: '범위 밖', placeIds: ['sight0'] },
    ],
    request,
    candidates,
  );
  assert.deepEqual(choices, [
    { date: '2026-10-28', title: '호수 여행', placeIds: ['sight7'] },
  ]);
  assert.deepEqual(
    parseCuratedDays(
      [{ date: '2026-10-28', placeIds: ['made-up-place'] }],
      request,
      candidates,
    ),
    [],
  );
});

test('a sparse AI first day keeps its visit and fills available meal and sightseeing time', () => {
  const result = buildDestinationItinerary(
    request,
    { durationSeconds: 5400 },
    candidates,
    [],
    [
      {
        date: '2026-10-28',
        title: '호수 산책 첫날',
        placeIds: ['sight7'],
        visits: [
          {
            placeId: 'sight7',
            kind: 'sightseeing',
            time: '11:45',
            durationMinutes: 75,
          },
        ],
      },
    ],
  );
  const firstDay = result.days[0].visits;
  assert.equal(firstDay[0].place.id, 'sight7');
  assert.equal(firstDay[0].time, '11:45');
  assert.ok(firstDay.length >= 3);
  assert.ok(firstDay.some((visit) => visit.kind === 'lunch'));
  assert.ok(firstDay.some((visit) => visit.kind === 'dinner'));
  assert.equal(result.curationSource, 'ai');
  for (let i = 1; i < firstDay.length; i++)
    assert.ok(
      minutes(firstDay[i].time) >=
        minutes(firstDay[i - 1].endTime) + firstDay[i].travelMinutes,
    );
});

test('local filling does not consume a place reserved by AI for a later day', () => {
  const result = buildDestinationItinerary(
    { ...request, endDate: '2026-10-30' },
    { durationSeconds: 5400 },
    candidates,
    [],
    [
      {
        date: '2026-10-30',
        title: '마지막 날 문화 산책',
        placeIds: ['sight1'],
        visits: [
          {
            placeId: 'sight1',
            kind: 'sightseeing',
            time: '09:45',
            durationMinutes: 90,
          },
        ],
      },
    ],
  );
  assert.ok(
    result.days.slice(0, 2).every((day) =>
      day.visits.every((visit) => visit.place.id !== 'sight1'),
    ),
  );
  assert.equal(result.days[2].visits[0].place.id, 'sight1');
  assert.equal(result.days[2].visits[0].time, '09:45');
});

test('AI visit times are shifted after arrival and cannot overlap or repeat a place', () => {
  const result = buildDestinationItinerary(
    request,
    { durationSeconds: 5400 },
    candidates,
    [],
    [
      {
        date: '2026-10-28',
        placeIds: [],
        visits: [
          {
            placeId: 'sight0',
            kind: 'sightseeing',
            time: '09:00',
            durationMinutes: 90,
          },
          {
            placeId: 'food0',
            kind: 'lunch',
            time: '10:00',
            durationMinutes: 60,
          },
          {
            placeId: 'sight0',
            kind: 'sightseeing',
            time: '15:00',
            durationMinutes: 60,
          },
        ],
      },
    ],
  );
  const visits = result.days[0].visits;
  assert.equal(visits.length, 2);
  assert.ok(minutes(visits[0].time) >= 11 * 60 + 30);
  assert.ok(
    minutes(visits[1].time) >=
      minutes(visits[0].endTime) + visits[1].travelMinutes,
  );
});

test('Gemini curator choices affect the real candidate itinerary', async () => {
  const curator = new DestinationCurator();
  let sent;
  curator.getGeminiClient = async () => ({
    modelName: 'stub-gemini',
    ai: {
      models: {
        generateContent: async (input) => {
          sent = JSON.parse(input.contents);
          return {
            text: JSON.stringify({
              days: [
                {
                  date: '2026-10-28',
                  title: '호수와 미식',
                  placeIds: ['sight7', 'food7', 'fake'],
                  visits: [
                    {
                      placeId: 'sight7',
                      kind: 'sightseeing',
                      time: '11:45',
                      durationMinutes: 75,
                    },
                    {
                      placeId: 'food7',
                      kind: 'lunch',
                      time: '13:30',
                      durationMinutes: 60,
                    },
                    {
                      placeId: 'fake',
                      kind: 'cafe',
                      time: '16:00',
                      durationMinutes: 45,
                    },
                  ],
                },
                {
                  date: '2026-10-29',
                  title: '문화 산책',
                  placeIds: ['sight6', 'food6'],
                  visits: [
                    {
                      placeId: 'sight6',
                      kind: 'sightseeing',
                      time: '09:45',
                      durationMinutes: 120,
                    },
                  ],
                },
              ],
            }),
          };
        },
      },
    },
  });
  const choices = await curator.choose(
    { ...request, travelStyle: '호수와 문화가 좋아요' },
    5400,
    candidates,
  );
  const itinerary = buildDestinationItinerary(
    request,
    { durationSeconds: 5400 },
    candidates,
    [],
    choices,
  );
  assert.equal(itinerary.curationSource, 'ai');
  assert.equal(itinerary.days[0].title, '호수와 미식');
  assert.ok(
    itinerary.days[0].visits.some((visit) => visit.place.id === 'sight7'),
  );
  assert.equal(itinerary.days[0].visits[0].time, '11:45');
  assert.equal(itinerary.days[0].visits[0].durationMinutes, 75);
  assert.equal(itinerary.days[1].visits[0].time, '09:45');
  assert.ok(!choices.some((day) => day.placeIds.includes('fake')));
  assert.equal(sent.travelStyle, '호수와 문화가 좋아요');
  assert.ok(sent.places.every((place) => !('latitude' in place)));
});

test('destination validation rejects invalid dates, overlong trips and unsupported transport', () => {
  assert.equal(destinationItineraryRequest(request).endDate, '2026-10-29');
  assert.equal(
    destinationItineraryRequest({ ...request, travelStyle: '호수 산책' })
      .travelStyle,
    '호수 산책',
  );
  for (const patch of [
    { mode: 'transit' },
    { startDate: '2026-02-30' },
    { endDate: '2026-10-27' },
    { endDate: '2026-11-10' },
    { departureTime: '24:30' },
    { includeLunch: 'false' },
    { travelStyle: 'x'.repeat(501) },
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
