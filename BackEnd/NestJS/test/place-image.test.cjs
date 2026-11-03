const { test } = require('node:test');
const assert = require('node:assert/strict');
const { placeImageUrl } = require('../dist/route-explorer/place-image');
const { ExplorerRepository } = require('../dist/route-explorer/explorer.repository');
const { copyRevisionItinerary } = require('../dist/chat/revision-context');
const { applyItineraryRevision } = require('../dist/chat/itinerary-revision');
const { LiveLodgingProvider } = require('../dist/route-explorer/live-lodging.provider');

test('photo URLs allow HTTPS and upgrade known TourAPI HTTP without accepting executable or credential URLs', () => {
  assert.equal(placeImageUrl('http://tong.visitkorea.or.kr/cms/photo.jpg'), 'https://tong.visitkorea.or.kr/cms/photo.jpg');
  assert.equal(placeImageUrl(' https://images.example.com/photo.jpg '), 'https://images.example.com/photo.jpg');
  for (const invalid of [undefined, null, '', {}, 'javascript:alert(1)', 'data:image/svg+xml,test', '//images.example.com/a.jpg', '/photo.jpg', 'http://other.example.com/photo.jpg', 'https://user:pass@example.com/a', 'x'.repeat(2049)]) assert.equal(placeImageUrl(invalid), null);
});

test('all recommendation SQL paths expose only the existing main_image_url without changing ranking or excluding missing photos', async () => {
  const queries = [];
  const repository = new ExplorerRepository({ query: async (sql, params) => {
    queries.push(sql);
    return [null, 'http://tong.visitkorea.or.kr/cms/photo.jpg', 'javascript:bad'].map((image, i) => ({
      place_id: `p-${i}`, name: `장소 ${i}`, address: '', latitude: 37, longitude: 127,
      content_type_id: 12, distance_meters: i, main_image_url: image,
    }));
  } });
  const center = { longitude: 127, latitude: 37 };
  const filter = { categoryIds: [], contentTypeIds: [12], radiusMeters: 1000, limit: 5 };
  const results = [
    await repository.candidates(filter, [[127, 37], [127.1, 37.1]]),
    await repository.placesAroundSpot(center, filter),
    await repository.revisionCandidates(center, center, { kind: 'sightseeing', excludePlaceIds: [], radiusMeters: 1000, limit: 5 }),
  ];
  for (const result of results) {
    assert.equal(result.places.length, 3);
    assert.deepEqual(result.places.map(p => p.imageUrl), [null, 'https://tong.visitkorea.or.kr/cms/photo.jpg', null]);
  }
  assert.ok(queries.every(sql => sql.includes('p.main_image_url') && !sql.includes('main_image_url IS NOT NULL')));
});

test('AI snapshot copying and a validated time revision preserve the actual photo URL', () => {
  const place = { id: 'place', name: '명소', address: '', latitude: 37, longitude: 127, contentTypeId: 12, categoryName: null, distanceMeters: 0, imageUrl: 'https://example.com/place.jpg' };
  const input = { arrivalDate: '2026-11-03', arrivalTime: '10:00', routePreference: 'recommended', curationSource: 'local', warnings: [], stayOptions: [place], days: [{ date: '2026-11-03', dayNumber: 1, title: '첫날', notes: [], visits: [{ place, kind: 'sightseeing', time: '11:00', endTime: '12:00', travelMinutes: 5, durationMinutes: 60 }] }] };
  const copy = copyRevisionItinerary(input);
  const result = applyItineraryRevision(copy, [{ date: '2026-11-03', visits: [{ placeId: 'place', kind: 'sightseeing', time: '14:00', durationMinutes: 60 }] }], [copy.days[0].visits[0].place]);
  assert.equal(result.days[0].visits[0].place.imageUrl, place.imageUrl);
  assert.equal(result.stayOptions[0].imageUrl, place.imageUrl);
  input.days[0].visits[0].place.imageUrl = 'javascript:bad';
  assert.equal(copyRevisionItinerary(input).days[0].visits[0].place.imageUrl, null);
});

test('live lodging supplies the same normalized photo field as registered DB places', async () => {
  const provider = new LiveLodgingProvider(() => ({ page: async () => ({ items: [{
    contenttypeid: 32, contentid: '123', title: '숙박', mapx: '127', mapy: '37', firstimage: 'http://tong.visitkorea.or.kr/photo.jpg',
  }] }) }));
  const result = await provider.nearby({ latitude: 37, longitude: 127 });
  assert.equal(result[0].imageUrl, 'https://tong.visitkorea.or.kr/photo.jpg');
});
