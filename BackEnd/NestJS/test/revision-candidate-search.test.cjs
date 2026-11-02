const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Logger, ConsoleLogger } = require('@nestjs/common');
const { ItineraryRevisionService } = require('../dist/chat/itinerary-revision.service');
const { ExplorerRepository } = require('../dist/route-explorer/explorer.repository');
const { parseCandidateSearch, inferCandidateSearch, searchRevisionCandidates } = require('../dist/chat/revision-candidate-search');

const place = (id, type, name, latitude = 37.88, longitude = 127.73) => ({
  id, contentTypeId: type, name, address: 'private-address', latitude, longitude,
  categoryName: type === 39 ? '음식점' : '관광지', distanceMeters: 300,
});
const sight = place('sight', 12, '명소', 37.881, 127.731);
const food = place('food', 39, '식당', 37.882, 127.732);
const second = place('second-sight', 14, '미술관', 37.883, 127.733);
const cafe = { ...place('new-cafe', 39, '새 카페'), categoryName: '카페' };
const spareFood = place('spare-food', 39, '일반 식당');
const pasta = place('new-pasta', 39, '파스타 식당');
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
const proposal = (p, kind = 'cafe') => ({ reply: '방문을 추가했습니다.', days: [{ date: '2026-11-03', visits: [
  { placeId: second.id, kind: 'sightseeing', time: '10:00', durationMinutes: 60 },
  { placeId: p.id, kind, time: '15:00', durationMinutes: 60 },
] }] });

function capture(t) {
  const logs = [];
  const collect = message => logs.push(JSON.parse(message));
  Logger.overrideLogger({ log: collect, warn: collect, error: collect });
  t.after(() => Logger.overrideLogger(new ConsoleLogger()));
  return logs;
}
function fixture(responses, initial = [], searched = [cafe]) {
  const queries = [], calls = [];
  const db = { query: async (sql, params) => {
    queries.push({ sql, params });
    assert.match(sql, /^(WITH|SELECT)/);
    if (sql.includes('matching_categories')) {
      const values = typeof searched === 'function' ? await searched(params) : searched;
      if (values instanceof Error) throw values;
      return values.map(row);
    }
    return initial.filter(p => params[1].includes(p.contentTypeId)).map(row);
  } };
  const service = new ItineraryRevisionService(db);
  service.getGeminiClient = async () => ({ modelName: 'gemini-3.5-flash-lite', ai: { models: {
    generateContent: async request => {
      calls.push(request);
      const response = responses[Math.min(calls.length - 1, responses.length - 1)];
      if (response instanceof Error) throw response;
      return { text: JSON.stringify(response) };
    },
  } } });
  return { service, calls, queries, searches: () => queries.filter(query => query.sql.includes('matching_categories')) };
}

test('missing cafe candidates trigger a bounded DB requery before AI and the discovered place can be added', async t => {
  capture(t);
  const original = structuredClone(itinerary);
  const { service, calls, searches } = fixture([proposal(cafe)]);
  const result = await service.revise({ ...base, message: '☕ 둘째 날 오후에 카페를 추가해줘' });
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[1].visits[1].place.id, cafe.id);
  assert.deepEqual(result.itinerary.days[0], itinerary.days[0]);
  assert.deepEqual(itinerary, original);
  assert.equal(calls.length, 1);
  assert.ok(searches().length >= 1 && searches().length <= 3);
  const context = JSON.parse(calls[0].contents);
  assert.equal(context.candidateSearch.kind, 'cafe');
  assert.equal(context.candidateSearch.newCandidateCount, 1);
  assert.equal(context.candidateSearchAvailable, true);
  assert.equal(context.candidateCoverage.unusedRecognizedCafeCount, 1);
  assert.ok(context.places.some(p => p.id === cafe.id));
  for (const query of searches()) {
    assert.equal(query.params[4], 20000);
    assert.equal(query.params[9], 25);
    assert.ok(query.params[6].includes(food.id));
  }
});

test('AI can request a parameterized named-place lookup and use only the refreshed candidate pool', async t => {
  capture(t);
  const requestSearch = { reply: '조건에 맞는 식당을 더 찾겠습니다.', days: [], searchRequest: { kind: 'food', dayNumber: 2, keyword: '파스타' } };
  const { service, calls, searches } = fixture([requestSearch, proposal(pasta, 'lunch')], [spareFood], [pasta]);
  const result = await service.revise({ ...base, message: '둘째 날 점심 식당을 추천해줘' });
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[1].visits[1].place.id, pasta.id);
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[0].contents).candidateSearchAvailable, true);
  const refreshed = JSON.parse(calls[1].contents);
  assert.equal(refreshed.candidateSearch.status, 'completed');
  assert.equal(refreshed.candidateSearchAvailable, false);
  assert.ok(refreshed.places.some(p => p.id === pasta.id));
  assert.ok(searches().every(query => query.params[7] === '%파스타%'));
});

test('a specific name can refine the initial shortage query once without repeating the same conditions', async t => {
  capture(t);
  const namedCafe = { ...cafe, id: 'named-cafe', name: '스타벅스 후보' };
  const lookup = { reply: '요청한 이름으로 더 찾습니다.', days: [], searchRequest: { kind: 'cafe', dayNumber: 2, keyword: '스타벅스' } };
  const { service, calls, searches } = fixture([lookup, proposal(namedCafe)], [], params => params[7] ? [namedCafe] : [cafe]);
  const result = await service.revise({ ...base, message: '둘째 날 스타벅스 카페를 추가해줘' });
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[1].visits[1].place.id, namedCafe.id);
  assert.equal(calls.length, 2);
  assert.ok(searches().length <= 6);
  assert.ok(searches().some(query => query.params[7] === null));
  assert.ok(searches().some(query => query.params[7] === '%스타벅스%'));
  const context = JSON.parse(calls[1].contents);
  assert.equal(context.candidateSearch.round, 2);
  assert.equal(context.candidateSearchAvailable, false);
});

test('zero results are explained with the searched scope and never cause repeated searches or fabricated visits', async t => {
  capture(t);
  const response = { reply: '추가할 카페 후보를 찾지 못했습니다.', days: [], searchRequest: { kind: 'cafe', dayNumber: 2 } };
  const { service, calls, searches } = fixture([response], [], []);
  const result = await service.revise({ ...base, message: '둘째 날 카페를 추가해줘' });
  assert.equal(result.changed, false);
  assert.equal(result.itinerary, null);
  assert.equal(calls.length, 1);
  assert.ok(searches().length <= 3);
  assert.match(result.reply, /20km.*다시 조사/);
  assert.match(result.reply, /새 카페 후보를 확보하지 못했습니다/);
  assert.equal(JSON.parse(calls[0].contents).candidateSearch.newCandidateCount, 0);
});

test('DB failure is distinct from no candidates and never leaks query text or secrets', async t => {
  const logs = capture(t);
  const error = new Error('private-db-password private-sql'); error.code = '42501';
  const { service, calls } = fixture([{ reply: '카페가 전혀 없습니다.', days: [] }], [], error);
  const result = await service.revise({ ...base, message: '둘째 날 카페를 추가해줘' });
  assert.equal(result.changed, false);
  assert.match(result.reply, /추가 장소 조회를 완료하지 못해/);
  assert.doesNotMatch(result.reply, /카페가 전혀 없습니다|private-/);
  assert.equal(JSON.parse(calls[0].contents).candidateSearch.status, 'failed');
  assert.ok(logs.some(log => log.dbCode === '42501'));
  assert.doesNotMatch(JSON.stringify(logs), /private-db-password|private-sql|private-address/);
});

test('search plans reject raw SQL, invalid kinds, unknown dates and unbounded keywords', async t => {
  capture(t);
  for (const invalid of [null, [], { kind: ['cafe'] }, { kind: 'hotel' }, { kind: 'cafe', radiusMeters: 999999 }, { kind: 'cafe', sql: 'DELETE FROM places' }, { kind: 'cafe', dayNumber: 3 }, { kind: 'cafe', keyword: 'x'.repeat(51) }]) {
    assert.equal(parseCandidateSearch(invalid, itinerary), null);
  }
  assert.deepEqual(inferCandidateSearch('둘째 날 카페를 추가해줘', itinerary, existing), { kind: 'cafe', dayNumber: 2 });
  assert.equal(inferCandidateSearch('카페를 추가하지 마', itinerary, existing), null);
  assert.equal(inferCandidateSearch('카페를 빼고 식당을 추가해줘', itinerary, existing).kind, 'food');
  const invalidSearch = { reply: '확인해 주세요.', days: [], searchRequest: { kind: 'food', sql: 'DROP TABLE places' } };
  const { service, searches, calls } = fixture([invalidSearch]);
  await service.revise({ ...base, message: '시간을 조정해줘' });
  assert.equal(searches().length, 0);
  assert.equal(calls.length, 1);
});

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

test('schema compatibility and AI-directed search share a maximum of three provider calls and one search round', async t => {
  capture(t);
  const badRequest = new Error(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'invalid request' } })); badRequest.status = 400;
  const lookup = { reply: '식당을 더 찾습니다.', days: [], searchRequest: { kind: 'food', dayNumber: 2 } };
  for (const last of [proposal(pasta, 'lunch'), proposal(pasta, 'sightseeing'), badRequest]) {
    const { service, calls, searches } = fixture([badRequest, lookup, last], [spareFood], [pasta]);
    const result = await service.revise({ ...base, message: '둘째 날 점심 식당을 추천해줘' });
    assert.equal(calls.length, 3);
    assert.ok(searches().length <= 3);
    assert.ok(calls[0].config.responseJsonSchema);
    assert.equal(calls[1].config.responseJsonSchema, undefined);
    assert.equal(calls[2].config.responseJsonSchema, undefined);
    assert.equal(result.changed, last !== badRequest && last.days[0].visits[1].kind === 'lunch');
  }
});
