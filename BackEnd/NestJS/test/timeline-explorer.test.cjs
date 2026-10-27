const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTimeToSeconds,
  formatSecondsToTime,
  findCoordinateAtElapsedSeconds,
} = require('../dist/route-explorer/timeline-calculator');
const {
  timelineRequest,
  nearbyPlacesRequest,
} = require('../dist/route-explorer/explorer.validation');
const { ExplorerService } = require('../dist/route-explorer/explorer.service');

const point = (longitude, latitude) => ({ longitude, latitude });
const sampleId = '12345678-1234-1234-1234-123456789abc';

test('timeline calculator converts HH:mm to seconds and formats correctly', () => {
  assert.equal(parseTimeToSeconds('09:30'), 34200);
  assert.equal(parseTimeToSeconds('00:00'), 0);
  assert.equal(parseTimeToSeconds('23:59'), 86340);
  assert.throws(() => parseTimeToSeconds('24:00'));
  assert.throws(() => parseTimeToSeconds('invalid'));

  assert.equal(formatSecondsToTime(34200), '09:30');
  assert.equal(formatSecondsToTime(0), '00:00');
  assert.equal(formatSecondsToTime(86400 + 3600), '01:00');
});

test('timeline calculator interpolates coordinates along route timeSpans', () => {
  const coordinates = [
    [127.0, 37.0],
    [127.5, 37.5],
    [128.0, 38.0],
  ];
  const timeSpans = [
    { fromIndex: 0, toIndex: 1, durationSeconds: 1000 },
    { fromIndex: 1, toIndex: 2, durationSeconds: 2000 },
  ];
  const total = 3000;

  // At start
  assert.deepEqual(findCoordinateAtElapsedSeconds(coordinates, timeSpans, total, 0), [127.0, 37.0]);
  // Midpoint of span 1 (alpha = 0.5)
  assert.deepEqual(findCoordinateAtElapsedSeconds(coordinates, timeSpans, total, 500), [127.25, 37.25]);
  // End of span 1
  assert.deepEqual(findCoordinateAtElapsedSeconds(coordinates, timeSpans, total, 1000), [127.5, 37.5]);
  // Midpoint of span 2 (alpha = 0.5)
  assert.deepEqual(findCoordinateAtElapsedSeconds(coordinates, timeSpans, total, 2000), [127.75, 37.75]);
  // Past total duration (at destination)
  assert.deepEqual(findCoordinateAtElapsedSeconds(coordinates, timeSpans, total, 3500), [128.0, 38.0]);
});

test('timeline validation accepts categoryIds, contentTypeIds and validates stops', () => {
  const valid = {
    mode: 'driving',
    points: [point(127, 37), point(128, 38)],
    departureTime: '09:30',
    stops: [
      {
        label: '점심 식사',
        targetTime: '12:30',
        contentTypeIds: [39],
        categoryIds: [sampleId],
        radiusMeters: 5000,
        limit: 5,
      },
    ],
  };

  const validated = timelineRequest(valid);
  assert.equal(validated.departureTime, '09:30');
  assert.equal(validated.stops.length, 1);
  assert.equal(validated.stops[0].label, '점심 식사');
  assert.equal(validated.stops[0].targetTime, '12:30');
  assert.deepEqual(validated.stops[0].contentTypeIds, [39]);
  assert.deepEqual(validated.stops[0].categoryIds, [sampleId]);
  assert.equal(validated.stops[0].radiusMeters, 5000);
  assert.equal(validated.stops[0].limit, 5);

  // Rejects invalid targetTime format
  assert.throws(() =>
    timelineRequest({
      ...valid,
      stops: [{ ...valid.stops[0], targetTime: '12-30' }],
    })
  );

  // Rejects out-of-range radius
  assert.throws(() =>
    timelineRequest({
      ...valid,
      stops: [{ ...valid.stops[0], radiusMeters: 50 }],
    })
  );
});

test('nearby validation accepts coordinates and filters and checks boundaries', () => {
  const valid = {
    latitude: 37.55,
    longitude: 126.97,
    contentTypeIds: [39],
    categoryIds: [sampleId],
    radiusMeters: 3000,
    limit: 5,
  };

  const validated = nearbyPlacesRequest(valid);
  assert.equal(validated.latitude, 37.55);
  assert.equal(validated.longitude, 126.97);
  assert.deepEqual(validated.contentTypeIds, [39]);
  assert.deepEqual(validated.categoryIds, [sampleId]);

  // Rejects out-of-bounds latitude
  assert.throws(() => nearbyPlacesRequest({ ...valid, latitude: 95 }));
  // Rejects out-of-bounds longitude
  assert.throws(() => nearbyPlacesRequest({ ...valid, longitude: 185 }));
});

test('ExplorerService.timeline coordinates waypoint interpolation and passes categoryIds to spot search', async () => {
  const routeResult = {
    preference: 'recommended',
    mode: 'driving',
    distanceMeters: 200000,
    durationSeconds: 7200, // 2 hours
    geometry: {
      type: 'LineString',
      coordinates: [
        [127.0, 37.0],
        [127.5, 37.5],
        [128.0, 38.0],
      ],
    },
    timeSpans: [
      { fromIndex: 0, toIndex: 1, durationSeconds: 3600 },
      { fromIndex: 1, toIndex: 2, durationSeconds: 3600 },
    ],
    attribution: null,
    warnings: [],
  };

  const planner = {
    route: async () => routeResult,
  };

  let searchedFilter = null;
  const repository = {
    candidates: async () => ({ places: [], limited: false }),
    placesAroundSpot: async (spot, filter) => {
      searchedFilter = { spot, filter };
      return {
        places: [
          {
            id: 'place-1',
            name: '영동 올갱이국밥',
            address: '충북 영동군',
            latitude: spot.latitude,
            longitude: spot.longitude,
            contentTypeId: 39,
            categoryName: '한식',
            distanceMeters: 450,
          },
        ],
        limited: false,
      };
    },
  };

  const service = new ExplorerService(planner, repository);

  // Depart at 09:00, lunch stop at 10:00 (1 hour in = 3600s)
  const result = await service.timeline({
    mode: 'driving',
    points: [point(127, 37), point(128, 38)],
    departureTime: '09:00',
    preference: 'recommended',
    stops: [
      {
        label: '점심 식사',
        targetTime: '10:00',
        contentTypeIds: [39],
        categoryIds: [sampleId],
        radiusMeters: 5000,
        limit: 5,
      },
    ],
  });

  assert.equal(result.departureTime, '09:00');
  assert.equal(result.estimatedArrivalTime, '11:00');
  assert.equal(result.stops.length, 1);
  assert.equal(result.stops[0].isAtDestination, false);
  assert.equal(result.stops[0].elapsedSeconds, 3600);
  assert.deepEqual(result.stops[0].waypoint, { longitude: 127.5, latitude: 37.5 });
  assert.equal(result.stops[0].places[0].name, '영동 올갱이국밥');

  // Verify categoryIds and contentTypeIds were passed to the repository query
  assert.ok(searchedFilter);
  assert.deepEqual(searchedFilter.filter.categoryIds, [sampleId]);
  assert.deepEqual(searchedFilter.filter.contentTypeIds, [39]);
});
