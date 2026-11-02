const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ExplorerRepository } = require('../dist/route-explorer/explorer.repository');
const { searchRevisionCandidates } = require('../dist/chat/revision-candidate-search');

const place = (id, type, name, latitude = 37.88, longitude = 127.73) => ({
  id, contentTypeId: type, name, address: 'private-address', latitude, longitude,
  categoryName: type === 39 ? '음식점' : '관광지', distanceMeters: 300,
});
const sight = place('sight', 12, '명소', 37.881, 127.731);
const food = place('food', 39, '식당', 37.882, 127.732);
const second = place('second-sight', 14, '미술관', 37.883, 127.733);
const cafe = { ...place('new-cafe', 39, '새 카페'), categoryName: '카페' };
const visit = (place, kind, time, endTime) => ({ place, kind, time, endTime, durationMinutes: 60, travelMinutes: 5 });
const itinerary = {
  arrivalDate: '2026-11-02', arrivalTime: '10:00', routePreference: 'recommended',
  days: [
    { date: '2026-11-02', dayNumber: 1, title: '첫날', notes: [], visits: [visit(sight, 'sightseeing', '11:00', '12:00'), visit(food, 'lunch', '13:00', '14:00')] },
    { date: '2026-11-03', dayNumber: 2, title: '둘째 날', notes: [], visits: [visit(second, 'sightseeing', '10:00', '11:00')] },
  ], stayOptions: [], warnings: [], curationSource: 'local',
};
const base = { itinerary, destination: { latitude: 37.88, longitude: 127.73 }, mode: 'driving' };
const existing = [sight, food, second];
const row = p => ({ place_id: p.id, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude, content_type_id: p.contentTypeId, category_name: p.categoryName, distance_meters: p.distanceMeters });
test('repository applies type, hierarchy, literal keyword and exclusions before LIMIT using bound parameters', async () => {
  let captured;
  const repository = new ExplorerRepository({ query: async (sql, params) => { captured = { sql, params }; return [row(cafe), { ...row(cafe), latitude: null }]; } });
  const keyword = "%_'; DROP TABLE places; --";
  const result = await repository.revisionCandidates(base.destination, base.destination, { kind: 'cafe', keyword, excludePlaceIds: ['FOOD'], radiusMeters: 20000, limit: 24 });
  assert.equal(result.places.length, 1);
  assert.equal(captured.sql.includes(keyword), false);
  assert.ok(captured.params[7].includes('\\%') && captured.params[7].includes('\\_'));
  assert.deepEqual(captured.params[6], ['food']);
  assert.deepEqual(captured.params[5], [39]);
  assert.match(captured.sql, /JOIN keyword_categories/);
  assert.match(captured.sql, /JOIN matching_categories/);
  assert.ok(captured.sql.indexOf('p.place_id::text <> ALL') < captured.sql.indexOf('LIMIT'));
  assert.ok(captured.sql.indexOf('p.name ILIKE') < captured.sql.indexOf('LIMIT'));
  assert.match(captured.sql, /ST_DWithin\(p.location,q.destination/);
});

test('walking search is capped at three centers and partial failure metadata contains no keyword or location text', async () => {
  const local = structuredClone(itinerary);
  local.days[1].visits.push(visit(place('last', 12, 'private-last', 37.884, 127.734), 'sightseeing', '12:00', '13:00'));
  const logs = [], filters = [];
  const result = await searchRevisionCandidates({ revisionCandidates: async (_spot, _destination, filter) => {
    filters.push(filter);
    if (filters.length === 2) throw new Error('private-db-value');
    return { places: [cafe, cafe, { ...cafe, latitude: null }], limited: true };
  } }, { kind: 'cafe', dayNumber: 2, keyword: 'private-keyword' }, local, base.destination, 'walking', existing, { emit: (event, fields) => logs.push({ event, ...fields }) });
  assert.equal(filters.length, 3);
  assert.ok(filters.every(filter => filter.radiusMeters === 5000 && filter.limit === 24));
  assert.equal(result.places.length, 1);
  assert.equal(result.summary.status, 'partial');
  assert.equal(result.summary.failedLookups, 1);
  assert.equal(result.summary.limited, true);
  assert.doesNotMatch(JSON.stringify(logs), /private-keyword|private-db-value|private-last|private-address/);
});
