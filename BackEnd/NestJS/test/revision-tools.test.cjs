const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Logger } = require('@nestjs/common');
const { RevisionTools } = require('../dist/chat/revision-tools');
const { RevisionRequestLimiter, RevisionRateLimitInterceptor } = require('../dist/chat/revision-request-limits');
const { withRevisionReadOnly } = require('../dist/chat/revision-readonly');
const { copyRevisionItinerary } = require('../dist/chat/revision-context');
const { ItineraryRevisionService } = require('../dist/chat/itinerary-revision.service');
const { call, wire } = require('./helpers/revision-model.cjs');
const trace = { emit() {} };
Logger.overrideLogger(false);
const place = (id, type = 12) => ({ id, name: type === 39 ? '새 카페' : '실제 명소', address: 'private-address', latitude: 35.85, longitude: 129.22, contentTypeId: type, categoryName: type === 39 ? '카페' : '관광지', distanceMeters: 100 });
const visit = p => ({ place: p, kind: 'sightseeing', time: '11:00', endTime: '12:00', travelMinutes: 5, durationMinutes: 60 });
const itinerary = {
  arrivalDate: '2026-11-02', arrivalTime: '10:00', routePreference: 'recommended', curationSource: 'local', warnings: [], stayOptions: [],
  days: [1, 2].map(n => ({ date: `2026-11-0${n + 1}`, dayNumber: n, title: `${n}일차`, notes: [], visits: [visit(place(`sight-${n}`))] })),
};
const request = { message: '둘째 날 오후 카페 추가', itinerary, destination: { latitude: 35.85, longitude: 129.22 }, mode: 'driving' };
const cafe = place('new-cafe', 39);
const row = p => ({ place_id: p.id, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude, content_type_id: p.contentTypeId, category_name: p.categoryName, distance_meters: p.distanceMeters });
function database(lookup = () => []) {
  const events = [], selects = [];
  const db = { createQueryRunner: () => {
    const runner = { isTransactionActive: false,
      connect: async () => events.push('connect'),
      startTransaction: async mode => { events.push(mode); runner.isTransactionActive = true; },
      query: async (sql, params) => { if (!params) { events.push(sql); return; } selects.push({ sql, params }); return lookup(params, selects.length); },
      commitTransaction: async () => { events.push('commit'); runner.isTransactionActive = false; },
      rollbackTransaction: async () => { events.push('rollback'); runner.isTransactionActive = false; },
      release: async () => events.push('release'),
    }; return runner;
  } };
  return { db, events, selects };
}
const toolsFor = (db, mode = 'driving', local = itinerary) => new RevisionTools(copyRevisionItinerary(local), request.destination, mode, db, trace, () => {});
const added = { reply: '둘째 날 카페를 추가했습니다.', days: [{ date: '2026-11-03', visits: [
  { placeId: 'sight-2', kind: 'sightseeing', time: '11:00', durationMinutes: 60 },
  { placeId: cafe.id, kind: 'cafe', time: '15:00', durationMinutes: 60 },
] }] };
const noCafe = { reply: '검색한 범위에 새 카페가 없습니다.', days: [], reason: 'no_candidates', targetDayNumber: 2, targetKind: 'cafe' };
function serviceWith(responses, db, limiter) {
  const calls = [];
  const service = new ItineraryRevisionService(db, limiter);
  service.getGeminiClient = async () => ({ modelName: 'native-test', ai: { models: { generateContent: async req => {
    calls.push(req); const r = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  } } } });
  return { service, calls };
}

test('mandatory snapshot includes actual last-day visits and is isolated from other request data', async () => {
  const a = toolsFor(); const b = toolsFor(undefined, 'driving', { ...itinerary, days: [itinerary.days[0]] });
  const result = await a.execute('get_current_itinerary', {});
  assert.equal(result.itinerary.lastDayNumber, 2);
  assert.equal(result.itinerary.days[1].isLastDay, true);
  assert.equal(result.itinerary.days[1].visitCounts.sightseeing, 1);
  assert.equal(result.itinerary.days[1].visits[0].placeName, '실제 명소');
  assert.equal((await b.execute('get_current_itinerary', {})).itinerary.lastDayNumber, 1);
  assert.doesNotMatch(JSON.stringify(result), /private-address|latitude|longitude|api_key/);
  const input = structuredClone(itinerary); input.secret = 'secret'; input.days[0].visits[0].place.secret = 'secret';
  const copy = copyRevisionItinerary(input); input.days[0].visits[0].place.name = '변경';
  assert.equal(copy.days[0].visits[0].place.name, '실제 명소');
  assert.doesNotMatch(JSON.stringify(copy), /secret/);
});

test('tool names and all arguments are allowlisted before any DB lookup', async () => {
  for (const [name, args, code] of [
    ['execute_sql', { sql: 'DROP TABLE places' }, 'TOOL_NOT_ALLOWED'],
    ['get_current_itinerary', { tripId: 'someone-else' }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', sql: 'SELECT * FROM users' }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', url: 'http://169.254.169.254' }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', radiusMeters: 999999 }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', latitude: 1 }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', dayNumber: 99 }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', keyword: 'x'.repeat(51) }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'users' }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', { kind: 'cafe', expand: 'yes' }, 'TOOL_ARGUMENTS_INVALID'],
    ['search_places', JSON.parse('{"kind":"cafe","__proto__":{}}'), 'TOOL_ARGUMENTS_INVALID'],
  ]) {
    const { db, selects, events } = database(); const tools = toolsFor(db);
    await tools.execute('get_current_itinerary', {});
    await assert.rejects(tools.execute(name, args), e => e.code === code);
    assert.equal(selects.length, 0); assert.equal(events.length, 0);
  }
  await assert.rejects(toolsFor().execute('search_places', { kind: 'cafe' }), e => e.code === 'CURRENT_ITINERARY_NOT_READ');
});

test('successful zero-result searches expand only through server radii and stop after two stages', async () => {
  for (const [mode, radii] of [['driving', [5000, 20000]], ['walking', [1000, 5000]]]) {
    const { db, selects, events } = database(); const tools = toolsFor(db, mode);
    await tools.execute('get_current_itinerary', {});
    const output = await tools.execute('search_places', { kind: 'cafe', dayNumber: 2 });
    assert.equal(output.status, 'completed'); assert.equal(output.newCandidateCount, 0);
    assert.deepEqual([...new Set(selects.map(q => q.params[4]))], radii);
    assert.ok(selects.length <= 6); assert.equal(tools.stages, 2);
    assert.equal(events.filter(e => e === 'SET TRANSACTION READ ONLY').length, 2);
    assert.ok(selects.every(q => /^WITH RECURSIVE/.test(q.sql) && q.params[9] === 25));
    const count = selects.length;
    await tools.execute('search_places', { kind: 'cafe', dayNumber: 2 });
    assert.equal(selects.length, count);
    assert.equal((await tools.execute('search_places', { kind: 'food' })).status, 'budget_exhausted');
  }
});

test('DB failure never becomes an empty successful search or triggers range expansion', async () => {
  const { db, selects } = database(() => { throw Object.assign(new Error('private SQL/password'), { code: '42501' }); });
  const tools = toolsFor(db); await tools.execute('get_current_itinerary', {});
  const output = await tools.execute('search_places', { kind: 'cafe', dayNumber: 2 });
  assert.equal(output.status, 'failed'); assert.equal(tools.stages, 1);
  assert.ok(selects.every(q => q.params[4] === 5000));
  assert.doesNotMatch(JSON.stringify(output), /private SQL|password/);
  const { service } = serviceWith([call('get_current_itinerary'), call('search_places', { kind: 'cafe', dayNumber: 2 }), wire(noCafe)], db);
  const result = await service.revise(request);
  assert.equal(result.changed, false); assert.match(result.reply, /조회.*실패|조회.*완료하지 못/);
  assert.doesNotMatch(result.reply, /검색한 범위에 새 카페가 없습니다/);
});

test('read-only transaction commits and releases; setup/work failures rollback and release', async () => {
  const { db, events } = database();
  assert.equal(await withRevisionReadOnly(db, async () => 42), 42);
  assert.deepEqual(events, ['connect', 'READ COMMITTED', 'SET TRANSACTION READ ONLY', "SET LOCAL statement_timeout = '3000ms'", "SET LOCAL lock_timeout = '500ms'", 'commit', 'release']);
  const failed = database();
  await assert.rejects(withRevisionReadOnly(failed.db, async () => { throw new Error('failure'); }));
  assert.deepEqual(failed.events.slice(-2), ['rollback', 'release']);
});

test('new candidates are capped without ever removing IDs already shown to AI', async () => {
  const candidates = Array.from({ length: 24 }, (_, i) => row(place(`cafe-${i}`, 39)));
  const { db } = database(() => candidates); const tools = toolsFor(db);
  await tools.execute('get_current_itinerary', {});
  const first = await tools.execute('search_places', { kind: 'cafe', dayNumber: 2 });
  assert.equal(first.places.length, 12); assert.equal(first.limited, true);
  const ids = new Set(tools.places.map(p => p.id));
  await tools.execute('search_places', { kind: 'food', expand: true });
  assert.ok([...ids].every(id => tools.places.some(p => p.id === id)));
  assert.ok(tools.places.length <= 80);
});

test('native read → DB search → validated proposal applies only the changed day and preserves tool signatures', async () => {
  const { db } = database(() => [row(cafe)]);
  const { service, calls } = serviceWith([call('get_current_itinerary', {}, 'read-id'), call('search_places', { kind: 'cafe', dayNumber: 2 }, 'search-id'), wire(added)], db);
  const original = structuredClone(itinerary); const result = await service.revise(request);
  assert.equal(result.changed, true); assert.equal(result.itinerary.days[1].visits[1].place.id, cafe.id);
  assert.deepEqual(result.itinerary.days[0], original.days[0]); assert.deepEqual(itinerary, original);
  assert.equal(calls.length, 3); assert.equal(calls[0].config.toolConfig.functionCallingConfig.mode, 'ANY');
  assert.deepEqual(calls[0].config.toolConfig.functionCallingConfig.allowedFunctionNames, ['get_current_itinerary']);
  assert.equal(calls[1].contents[1].parts[0].thoughtSignature, 'test-signature');
  assert.equal(calls[1].contents[2].parts[0].functionResponse.id, 'read-id');
  assert.equal(calls[2].contents.at(-1).parts[0].functionResponse.id, 'search-id');
  assert.ok(calls.every(c => !c.config.responseJsonSchema && !c.config.responseMimeType && c.config.httpOptions.retryOptions.attempts === 1));
});

test('proposals without reading, unknown tools, executable parts and oversized batches fail closed', async () => {
  for (const responses of [
    [wire(added)],
    [call('get_current_itinerary'), call('execute_sql', { sql: 'DROP TABLE places' })],
    [{ candidates: [{ content: { role: 'model', parts: [{ executableCode: { code: 'malicious' } }] } }] }],
    [call('get_current_itinerary'), { candidates: [{ content: { role: 'model', parts: Array(3).fill({ functionCall: { name: 'search_places', args: { kind: 'cafe' } } }) } }] }],
  ]) {
    const { db, selects } = database(); const { service, calls } = serviceWith(responses, db);
    const result = await service.revise(request);
    assert.equal(result.changed, false); assert.equal(result.itinerary, null);
    assert.ok(calls.length <= 2); assert.equal(selects.length, 0);
  }
});

test('repeated tools cannot exceed per-request generation or tool budgets', async () => {
  const { service, calls } = serviceWith([call('get_current_itinerary')]);
  const result = await service.revise(request);
  assert.equal(result.changed, false); assert.equal(calls.length, 5);
  assert.equal(calls.at(-1).config.tools, undefined);
  assert.equal(calls.at(-1).config.responseMimeType, 'application/json');
  const tools = toolsFor();
  for (let i = 0; i < 6; i++) await tools.execute('get_current_itinerary', {});
  await assert.rejects(tools.execute('get_current_itinerary', {}), e => e.code === 'TOOL_BUDGET_EXCEEDED');
});

test('provider-wide budget and deadline prevent new work; oversized provider content is rejected', async () => {
  const limiter = new RevisionRequestLimiter();
  for (let i = 0; i < 120; i++) limiter.consumeProvider();
  const { service, calls } = serviceWith([call('get_current_itinerary')], undefined, limiter);
  const exhausted = await service.revise(request);
  assert.equal(calls.length, 0); assert.equal(exhausted.changed, false);
  assert.match(exhausted.reply, /서버 전체의 AI 호출 한도/);
  const { db, selects } = database();
  const expired = new RevisionTools(copyRevisionItinerary(itinerary), request.destination, 'driving', db, trace,
    () => { throw Object.assign(new Error('deadline'), { code: 'DEADLINE_EXCEEDED' }); });
  await assert.rejects(expired.execute('get_current_itinerary', {}), e => e.code === 'DEADLINE_EXCEEDED');
  assert.equal(selects.length, 0);
  const oversized = serviceWith([wire('x'.repeat(65536))]);
  assert.equal((await oversized.service.revise(request)).changed, false);
  assert.equal(oversized.calls.length, 1);
});

test('false missing-attraction claims are corrected once against actual last-day visits', async () => {
  const falseClaim = { reply: '마지막 날에 관광지가 없습니다.', days: [], reason: 'no_existing_visit', targetDayNumber: 2, targetKind: 'sightseeing' };
  const changed = structuredClone(added); changed.days[0].visits = [changed.days[0].visits[0]]; changed.days[0].visits[0].time = '14:00';
  const { service, calls } = serviceWith([call('get_current_itinerary'), wire(falseClaim), wire(changed)]);
  assert.equal((await service.revise(request)).changed, true); assert.equal(calls.length, 3);
  const persistent = serviceWith([call('get_current_itinerary'), wire(falseClaim), wire(falseClaim)]);
  const result = await persistent.service.revise(request);
  assert.equal(result.changed, false); assert.match(result.reply, /이유가 현재 일정.*맞지 않아/);
  assert.doesNotMatch(result.reply, /마지막 날에 관광지가 없습니다/);
});

test('no-candidate explanation requires an actual completed search for the target day', async () => {
  const { service, calls } = serviceWith([call('get_current_itinerary'), wire(noCafe), call('search_places', { kind: 'cafe', dayNumber: 2 }), wire(noCafe)], database().db);
  const result = await service.revise(request);
  assert.equal(result.changed, false); assert.match(result.reply, /20km/); assert.match(result.reply, /검색한 범위에 새 카페가 없습니다/);
  assert.equal(calls.length, 4);
});

test('rate limits preserve anonymous access and bound IP, global, concurrent and provider work', () => {
  let now = 0; const limit = new RevisionRequestLimiter(() => now);
  for (let i = 0; i < 10; i++) limit.acquire('192.0.2.1')();
  assert.throws(() => limit.acquire('192.0.2.1'), e => e.getStatus() === 429);
  limit.acquire('192.0.2.2')();
  now = 60000; limit.acquire('192.0.2.1')();
  const global = new RevisionRequestLimiter();
  for (let i = 0; i < 30; i++) global.acquire(`192.0.2.${i}`)();
  assert.throws(() => global.acquire('192.0.2.100'), e => e.getStatus() === 429);
  const concurrent = new RevisionRequestLimiter(); const releases = Array.from({ length: 3 }, () => concurrent.acquire('192.0.2.1'));
  assert.throws(() => concurrent.acquire('192.0.2.2'), e => e.getStatus() === 429);
  releases[0](); releases[0](); const release = concurrent.acquire('192.0.2.2');
  assert.throws(() => concurrent.acquire('192.0.2.3')); release(); releases.forEach(r => r());
  for (let i = 0; i < 120; i++) limit.consumeProvider();
  assert.throws(() => limit.consumeProvider(), e => e.code === 'PROVIDER_BUDGET_EXCEEDED');
  now += 60000; limit.consumeProvider();
});

test('disconnect does not release a concurrency slot until actual server work settles', async () => {
  const { Subject, of, lastValueFrom } = require('rxjs');
  const limiter = new RevisionRequestLimiter(); const interceptor = new RevisionRateLimitInterceptor(limiter);
  const context = { switchToHttp: () => ({ getRequest: () => ({ ip: '192.0.2.1' }) }) };
  const pending = new Subject();
  const subscription = interceptor.intercept(context, { handle: () => pending }).subscribe();
  subscription.unsubscribe();
  const r1 = limiter.acquire('192.0.2.2'), r2 = limiter.acquire('192.0.2.3');
  assert.throws(() => limiter.acquire('192.0.2.4'));
  pending.next('done'); pending.complete(); await new Promise(resolve => setImmediate(resolve));
  limiter.acquire('192.0.2.4')(); r1(); r2();
  assert.equal(await lastValueFrom(interceptor.intercept(context, { handle: () => of('OK') })), 'OK');
  assert.throws(() => interceptor.intercept(context, { handle: () => { throw new Error('failed'); } }));
  const releases = Array.from({ length: 3 }, () => limiter.acquire('192.0.2.5')); releases.forEach(r => r());
});

test('real Google SDK sends native tool schema, original thought signature and matching function response IDs', async t => {
  const http = require('node:http'); const { once } = require('node:events'); const { GoogleGenAI } = require('@google/genai');
  const bodies = []; const outputs = [call('get_current_itinerary', {}, 'real-read'), call('search_places', { kind: 'cafe', dayNumber: 2 }, 'real-search'), wire(added)];
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    bodies.push(JSON.parse(body)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(outputs[bodies.length - 1]));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
  const service = new ItineraryRevisionService(database(() => [row(cafe)]).db);
  service.getGeminiClient = async () => ({ modelName: 'gemini-test', ai: new GoogleGenAI({ apiKey: 'fake-local-key', httpOptions: { baseUrl: `http://127.0.0.1:${server.address().port}` } }) });
  const result = await service.revise(request);
  assert.equal(result.changed, true); assert.equal(bodies.length, 3);
  assert.equal(bodies[0].tools[0].functionDeclarations[0].name, 'get_current_itinerary');
  assert.equal(bodies[1].contents[1].parts[0].thoughtSignature, 'test-signature');
  assert.equal(bodies[1].contents[2].parts[0].functionResponse.id, 'real-read');
  assert.equal(bodies[2].contents[4].parts[0].functionResponse.id, 'real-search');
  assert.doesNotMatch(JSON.stringify(bodies), /fake-local-key|private-address|DB_PASSWORD/);
});
