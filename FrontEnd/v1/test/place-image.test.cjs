const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
const { placeImageUrl } = require('../src/services/place-image.ts');
const output = buildSync({ entryPoints: [path.resolve(__dirname, '../src/services/route-explorer.ts')], bundle: true, platform: 'node', format: 'cjs', write: false });
const loaded = new Module(__filename + '.contract');
loaded._compile(output.outputFiles[0].text, __filename + '.contract');
const { parseDestinationItinerary, parseComparison } = loaded.exports;
const original = () => ({ arrivalDate: '2026-11-03', arrivalTime: '10:00', routePreference: 'recommended', curationSource: 'local', warnings: [], stayOptions: [], days: [{ date: '2026-11-03', dayNumber: 1, title: '첫날', notes: [], visits: [{ kind: 'sightseeing', time: '11:00', endTime: '12:00', travelMinutes: 5, durationMinutes: 60, place: { id: 'place', name: '사진 있는 명소', address: '', latitude: 37, longitude: 127, contentTypeId: 12, categoryName: null, distanceMeters: 0 } }] }] });

test('place photo URL filtering rejects unsafe, relative and unsupported URLs', () => {
  assert.equal(placeImageUrl('http://tong.visitkorea.or.kr/photo.jpg'), 'https://tong.visitkorea.or.kr/photo.jpg');
  assert.equal(placeImageUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  for (const invalid of [undefined, null, '', {}, 'javascript:alert(1)', 'data:image/svg+xml,bad', '//example.com/a', '/photo.jpg', 'http://example.com/photo.jpg', 'https://user:pass@example.com/a', 'x'.repeat(2049)]) assert.equal(placeImageUrl(invalid), null);
});

test('itinerary parsing preserves photos for visits and stays, and accepts older API responses without images', () => {
  const input = original(); const place = input.days[0].visits[0].place;
  place.imageUrl = 'https://example.com/visit.jpg'; input.stayOptions = [{ ...place, id: 'stay', contentTypeId: 32 }];
  const result = parseDestinationItinerary(input);
  assert.equal(result.days[0].visits[0].place.imageUrl, place.imageUrl);
  assert.equal(result.stayOptions[0].imageUrl, place.imageUrl);
  assert.equal(parseDestinationItinerary(original()).days[0].visits[0].place.imageUrl, null);
  place.imageUrl = 'javascript:bad';
  assert.equal(parseDestinationItinerary(input).days[0].visits[0].place.imageUrl, null);
});

test('route comparison preserves valid photo URLs and drops invalid photo values without losing recommendations', () => {
  const points = [{ longitude: 127, latitude: 37 }, { longitude: 127.1, latitude: 37.1 }];
  const request = { mode: 'driving', points, radiusMeters: 1000, limit: 10 };
  const route = { mode: 'driving', preference: 'recommended', distanceMeters: 1000, durationSeconds: 600,
    geometry: { type: 'LineString', coordinates: points.map(p => [p.longitude, p.latitude]) }, timeSpans: [{ fromIndex: 0, toIndex: 1, durationSeconds: 600 }],
    cacheId: '00000000-0000-4000-8000-000000000001', cached: false, trafficApplied: false, warnings: [], attribution: null, fetchedAt: '2026-11-03T00:00:00Z', expiresAt: '2026-11-04T00:00:00Z' };
  const base = original().days[0].visits[0].place;
  const data = { radiusMeters: 1000, recommendationBasis: 'distance_to_route', routes: ['recommended', 'shortest'].map(preference => ({
    preference, route: { ...route, preference }, candidateLimitReached: false, routeError: null, recommendationError: null,
    places: ['https://example.com/photo.jpg', undefined, 'javascript:bad'].map((imageUrl, index) => ({ ...base, id: `place-${index}`, distanceToRouteMeters: 100, imageUrl })),
  })) };
  const result = parseComparison(data, request);
  assert.equal(result.routes[0].places.length, 3);
  assert.deepEqual(result.routes[0].places.map(p => p.imageUrl), ['https://example.com/photo.jpg', null, null]);
});
