const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { ItineraryRevisionService } = require('../dist/chat/itinerary-revision.service');

const place = (id, type, name) => ({
  id, name, address: '강원 춘천시', latitude: 37.8813, longitude: 127.7298,
  contentTypeId: type, categoryName: type === 39 ? '음식점' : '관광지', distanceMeters: 100,
});
const sight = place('sight-1', 12, '기존 명소');
const food = place('food-1', 39, '기존 식당');
const alternative = place('food-2', 39, '새 식당');
const itinerary = {
  arrivalDate: '2026-10-30', arrivalTime: '10:00', routePreference: 'recommended',
  days: [{
    date: '2026-10-30', dayNumber: 1, title: '춘천의 첫날', notes: [],
    visits: [
      { kind: 'sightseeing', time: '11:00', endTime: '12:00', place: sight, durationMinutes: 60, travelMinutes: 5 },
      { kind: 'lunch', time: '13:00', endTime: '14:00', place: food, durationMinutes: 60, travelMinutes: 5 },
    ],
  }], stayOptions: [], warnings: [], curationSource: 'local',
};
const request = { message: '첫날 점심 식당을 바꿔줘', itinerary, destination: { latitude: 37.8813, longitude: 127.7298 }, mode: 'driving' };
const secondSight = { ...sight, id: 'sight-2', name: '둘째 날 명소' };
const twoDayItinerary = {
  ...itinerary,
  days: [...itinerary.days, {
    date: '2026-10-31', dayNumber: 2, title: '둘째 날', notes: [],
    visits: [{ ...itinerary.days[0].visits[0], place: secondSight }],
  }],
};
const secondDayChange = {
  date: '2026-10-31',
  visits: [{ placeId: secondSight.id, kind: 'sightseeing', time: '14:00', durationMinutes: 60 }],
};
const days = (foodId, lunchTime = '13:00') => [{
  date: '2026-10-30', visits: [
    { placeId: sight.id, kind: 'sightseeing', time: '11:00', durationMinutes: 60 },
    { placeId: foodId, kind: 'lunch', time: lunchTime, durationMinutes: 60 },
  ],
}];

function serviceWithModel(payload, db) {
  const service = new ItineraryRevisionService(db);
  service.getGeminiClient = async () => ({
    modelName: 'revision-test',
    ai: { models: { generateContent: async () => ({ text: JSON.stringify(payload) }) } },
  });
  return service;
}

function invalidArgument(reason) {
  const error = new Error(JSON.stringify({ error: {
    code: 400, status: 'INVALID_ARGUMENT', message: 'Request contains an invalid argument.',
    details: reason ? [{ reason }] : [],
  } }));
  error.status = 400;
  return error;
}

function kindMismatchFixture() {
  const places = [secondSight, { ...food, id: 'day-two-food' }, { ...food, id: 'day-two-cafe' }, { ...sight, id: 'day-two-last-sight' }];
  const visits = places.map((place, index) => ({
    place, kind: ['sightseeing', 'lunch', 'cafe', 'sightseeing'][index],
    time: ['10:00', '12:00', '14:00', '16:00'][index],
    endTime: ['11:00', '13:00', '15:00', '17:00'][index],
    durationMinutes: 60, travelMinutes: 5,
  }));
  const input = { ...request, message: '둘째 날 마지막 명소 방문을 한 시간 늦춰줘', itinerary: {
    ...twoDayItinerary, days: [itinerary.days[0], { ...twoDayItinerary.days[1], visits }],
  } };
  const valid = { reply: '둘째 날 마지막 방문을 늦췄습니다.', days: [{
    date: '2026-10-31', visits: visits.map((visit, index) => ({
      placeId: visit.place.id, kind: visit.kind,
      time: index === 3 ? '17:00' : visit.time, durationMinutes: visit.durationMinutes,
    })),
  }] };
  const invalid = structuredClone(valid);
  invalid.days[0].visits[3].kind = 'cafe';
  return { input, valid, invalid };
}

function serviceWithResponses(responses) {
  const service = new ItineraryRevisionService();
  const calls = [];
  service.getGeminiClient = async () => ({ modelName: 'revision-test', ai: { models: {
    generateContent: async input => {
      calls.push(input);
      const response = responses[Math.min(calls.length - 1, responses.length - 1)];
      if (response instanceof Error) throw response;
      return { text: typeof response === 'string' ? response : JSON.stringify(response) };
    },
  } } });
  return { service, calls };
}

test('a day-two fourth-visit kind mismatch is repaired once using candidate allowedKinds and exact validation feedback', async () => {
  const { input, valid, invalid } = kindMismatchFixture();
  const original = structuredClone(input.itinerary);
  const { service, calls } = serviceWithResponses([invalid, valid]);
  const result = await service.revise(input);
  assert.equal(calls.length, 2);
  const initialContext = JSON.parse(calls[0].contents);
  assert.deepEqual(initialContext.places.find(place => place.id === 'day-two-last-sight').allowedKinds, ['sightseeing']);
  assert.deepEqual(initialContext.places.find(place => place.id === 'day-two-food').allowedKinds, ['lunch', 'cafe', 'dinner']);
  const feedback = JSON.parse(calls[1].contents);
  assert.equal(feedback.message, input.message);
  assert.deepEqual(feedback.rejectedDays, invalid.days);
  assert.deepEqual(feedback.validationFeedback, { reason: 'place_kind_mismatch', position: {
    dayIndex: 1, visitIndex: 3, requestedKind: 'cafe', contentTypeId: 12, allowedKinds: ['sightseeing'],
  } });
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[1].visits[3].time, '17:00');
  assert.equal(result.itinerary.days[1].visits[3].kind, 'sightseeing');
  assert.deepEqual(result.itinerary.days[0], original.days[0]);
  assert.deepEqual(input.itinerary, original);
});

test('a failed repair stays bounded and never applies wrong kinds, invented places, overlapping times or malformed JSON', async () => {
  const { input, valid, invalid } = kindMismatchFixture();
  const invented = structuredClone(valid);
  invented.days[0].visits[3].placeId = 'invented-place';
  const overlapping = structuredClone(valid);
  overlapping.days[0].visits[3].time = '14:30';
  for (const failedRepair of [invalid, invented, overlapping, 'not-json', new Error('provider failed')]) {
    const original = structuredClone(input.itinerary);
    const { service, calls } = serviceWithResponses([invalid, failedRepair]);
    const result = await service.revise(input);
    assert.equal(calls.length, 2);
    assert.equal(result.changed, false);
    assert.equal(result.itinerary, null);
    assert.deepEqual(input.itinerary, original);
  }
});

test('kind repair reuses the working JSON mode after a structured-output 400 and never sends a fourth request', async () => {
  const { input, valid, invalid } = kindMismatchFixture();
  for (const repaired of [valid, invalidArgument()]) {
    const { service, calls } = serviceWithResponses([invalidArgument(), invalid, repaired]);
    const result = await service.revise(input);
    assert.equal(calls.length, 3);
    assert.ok(calls[0].config.responseJsonSchema);
    assert.equal(calls[1].config.responseJsonSchema, undefined);
    assert.equal(calls[2].config.responseJsonSchema, undefined);
    assert.equal(calls[2].config.responseMimeType, 'application/json');
    assert.equal(result.changed, repaired === valid);
  }
});

test('empty, unchanged and unrelated invalid proposals do not trigger kind repair', async () => {
  const { input, valid } = kindMismatchFixture();
  const invented = structuredClone(valid);
  invented.days[0].visits[3].placeId = 'invented-place';
  const unchanged = { reply: '설명', days: days(food.id) };
  for (const proposal of [{ reply: '질문', days: [] }, unchanged, invented]) {
    const { service, calls } = serviceWithResponses([proposal]);
    const result = await service.revise(input);
    assert.equal(calls.length, 1);
    assert.equal(result.changed, false);
  }
});

test('an empty cafe proposal preserves the shortage explanation and reports candidate coverage without claiming an edit', async () => {
  const explanation = '현재 주변 등록 후보에는 추가할 카페가 없습니다. 다른 방문 장소를 요청해 주세요.';
  const { service, calls } = serviceWithResponses([{ reply: explanation, days: [] }]);
  const result = await service.revise({ ...request, itinerary: twoDayItinerary, message: '☕ 둘째 날 오후에 카페를 추가해줘' });
  assert.equal(calls.length, 1);
  assert.equal(result.changed, false);
  assert.equal(result.itinerary, null);
  assert.ok(result.reply.startsWith('현재 화면의 일정은 변경되지 않았습니다.'));
  assert.ok(result.reply.includes(explanation));
  assert.doesNotMatch(result.reply, /안전하게 적용할 수 없었습니다|일정에 반영했습니다/);
  assert.deepEqual(JSON.parse(calls[0].contents).candidateCoverage, {
    foodCount: 1, unusedFoodCount: 0, recognizedCafeCount: 0, unusedRecognizedCafeCount: 0,
  });
});

test('empty proposals without an explanation get a clear no-change prompt while invalid proposals keep their rejection', async () => {
  const empty = await serviceWithModel({ reply: '', days: [] }).revise(request);
  assert.equal(empty.changed, false);
  assert.match(empty.reply, /이유를 제시하지 않았습니다/);
  const invalid = await serviceWithModel({ reply: '점심을 다른 식당으로 바꿨습니다.', days: days('invented-place') }).revise(request);
  assert.equal(invalid.changed, false);
  assert.match(invalid.reply, /제공된 후보에 없는 장소/);
  assert.doesNotMatch(invalid.reply, /점심을 다른 식당으로 바꿨습니다/);
});

test('validation failures explain the actual date, duplicate, time, capacity and duration constraint', async () => {
  const atTime = time => {
    const proposal = days(food.id);
    proposal[0].visits[0].time = time;
    return proposal;
  };
  const invalidTime = days(food.id); invalidTime[0].visits[1].time = '오후';
  const invalidDuration = days(food.id); invalidDuration[0].visits[1].durationMinutes = 20;
  const tooMany = days(food.id); tooMany[0].visits = Array(7).fill(tooMany[0].visits[0]);
  for (const [proposal, reason] of [
    [days(food.id, '11:30'), /앞 방문과 겹치거나/],
    [days(food.id, '19:30'), /오후 8시/],
    [atTime('08:30'), /오전 9시/],
    [atTime('09:30'), /목적지 도착 시각/],
    [days(sight.id), /같은 장소가 중복/],
    [[{ ...days(food.id)[0], date: '2030-01-01' }], /여행 기간에 없는 날짜/],
    [invalidTime, /방문 시각을 읽을 수 없어/],
    [invalidDuration, /30~180분/],
    [tooMany, /하루 최대 6곳/],
  ]) {
    const { service, calls } = serviceWithResponses([{ reply: '변경 완료', days: proposal }]);
    const original = structuredClone(itinerary);
    const result = await service.revise(request);
    assert.equal(calls.length, 1);
    assert.equal(result.changed, false);
    assert.equal(result.itinerary, null);
    assert.match(result.reply, reason);
    assert.doesNotMatch(result.reply, /안전하게 적용|변경 완료/);
    assert.deepEqual(itinerary, original);
  }
});

test('provider failures explain quota, authentication, timeout and request errors without exposing exception text', async () => {
  const quota = new Error(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7.2s' }] } }));
  quota.status = 429;
  const auth = new Error('private-auth-value'); auth.status = 403;
  const timeout = new Error('private-timeout-value'); timeout.name = 'AbortError';
  const unavailable = new Error('private-provider-value'); unavailable.status = 503;
  const missingModel = new Error('private-model-value'); missingModel.status = 404;
  for (const [error, explanation] of [
    [quota, /호출 한도.*8초/], [auth, /인증 또는 접근 권한/], [timeout, /대기 시간이 초과/],
    [unavailable, /AI 서비스에서 서버 오류/], [missingModel, /AI 모델을 사용할 수 없어/],
    [invalidArgument(), /요청의 형식을 허용하지 않아/],
    [new Error('private-unknown-value'), /구체적인 원인은 아직 확인되지 않았습니다/],
  ]) {
    const { service } = serviceWithResponses([error]);
    const result = await service.revise(request);
    assert.equal(result.changed, false);
    assert.equal(result.itinerary, null);
    assert.match(result.reply, explanation);
    assert.doesNotMatch(result.reply, /private-|AI 수정 요청을 처리하지 못했습니다/);
  }
  const malformed = await serviceWithResponses(['invalid-json']).service.revise(request);
  assert.match(malformed.reply, /AI 응답의 형식이 잘못되어/);
});

test('a structured-output 400 retries once in JSON mode and applies the validated revision', async () => {
  const service = new ItineraryRevisionService();
  const calls = [];
  service.getGeminiClient = async () => ({ modelName: 'gemini-3.5-flash-lite', ai: { models: {
    generateContent: async input => {
      calls.push(input);
      if (calls.length === 1) throw invalidArgument();
      return { text: JSON.stringify({ reply: '점심 시간을 늦췄습니다.', days: days(food.id, '14:00') }) };
    },
  } } });
  const result = await service.revise(request);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].model, calls[1].model);
  assert.equal(calls[0].contents, calls[1].contents);
  assert.ok(calls[0].config.responseJsonSchema);
  assert.equal(calls[1].config.responseJsonSchema, undefined);
  assert.equal(calls[1].config.responseMimeType, 'application/json');
  assert.equal(calls[0].config.systemInstruction, calls[1].config.systemInstruction);
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[0].visits[1].time, '14:00');
  assert.equal(result.modelUsed, 'gemini-3.5-flash-lite');
  assert.equal(itinerary.days[0].visits[1].time, '13:00');
});

test('JSON mode fallback still rejects invented places, unknown dates and overlapping times atomically', async () => {
  for (const proposal of [days('invented-place'), days(food.id, '11:30'), [{ ...days(food.id)[0], date: '2030-01-01' }]]) {
    const service = new ItineraryRevisionService();
    let calls = 0;
    service.getGeminiClient = async () => ({ modelName: 'revision-test', ai: { models: {
      generateContent: async () => {
        if (++calls === 1) throw invalidArgument();
        return { text: JSON.stringify({ reply: '수정 완료', days: proposal }) };
      },
    } } });
    const original = structuredClone(itinerary);
    const result = await service.revise(request);
    assert.equal(calls, 2);
    assert.equal(result.changed, false);
    assert.equal(result.itinerary, null);
    assert.deepEqual(itinerary, original);
  }
});

test('a failed JSON mode fallback is bounded to two provider requests', async () => {
  const service = new ItineraryRevisionService();
  let calls = 0;
  service.getGeminiClient = async () => ({ modelName: 'revision-test', ai: { models: {
    generateContent: async () => { calls++; throw invalidArgument(); },
  } } });
  const result = await service.revise(request);
  assert.equal(calls, 2);
  assert.equal(result.changed, false);
  assert.equal(result.itinerary, null);
});

test('authentication, quota and unrelated errors never trigger a compatibility request', async () => {
  const credentialError = invalidArgument();
  credentialError.message = JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.' } });
  for (const error of [invalidArgument('API_KEY_INVALID'), credentialError, { status: 403 }, { status: 429 }, { status: 500 }, new Error('network failure')]) {
    const service = new ItineraryRevisionService();
    let calls = 0;
    service.getGeminiClient = async () => ({ modelName: 'revision-test', ai: { models: {
      generateContent: async () => { calls++; throw error; },
    } } });
    assert.equal((await service.revise(request)).changed, false);
    assert.equal(calls, 1);
  }
});

test('a successful provider response with invalid JSON never retries or changes the itinerary', async () => {
  const service = new ItineraryRevisionService();
  let calls = 0;
  service.getGeminiClient = async () => ({ modelName: 'revision-test', ai: { models: {
    generateContent: async () => { calls++; return { text: 'not-json' }; },
  } } });
  const result = await service.revise(request);
  assert.equal(calls, 1);
  assert.equal(result.changed, false);
  assert.equal(result.itinerary, null);
});

test('the real Google SDK recovers from HTTP 400 by removing only the structured response schema', async t => {
  const { createServer } = require('node:http');
  const { GoogleGenAI } = require('@google/genai');
  const bodies = [];
  const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    bodies.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    outgoing.setHeader('Content-Type', 'application/json');
    if (bodies.length === 1) {
      outgoing.statusCode = 400;
      outgoing.end(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Request contains an invalid argument.' } }));
    } else {
      outgoing.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ reply: '점심을 늦췄습니다.', days: days(food.id, '14:00') }) }] }, finishReason: 'STOP' }] }));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const service = new ItineraryRevisionService();
  service.getGeminiClient = async () => ({
    modelName: 'gemini-3.5-flash-lite',
    ai: new GoogleGenAI({ apiKey: 'test-only-key', httpOptions: { baseUrl: `http://127.0.0.1:${server.address().port}`, timeout: 3000, retryOptions: { attempts: 1 } } }),
  });
  const result = await service.revise(request);
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[0].visits[1].time, '14:00');
  assert.equal(bodies.length, 2);
  assert.ok(bodies[0].generationConfig.responseJsonSchema);
  assert.equal(bodies[1].generationConfig.responseJsonSchema, undefined);
  const { responseJsonSchema, ...firstConfig } = bodies[0].generationConfig;
  assert.deepEqual(firstConfig, bodies[1].generationConfig);
  assert.deepEqual(bodies[0].contents, bodies[1].contents);
});

test('AI replacement with a real DB candidate changes the itinerary shown to the client', async () => {
  const db = { query: async (_sql, params) => params[1].includes(39) ? [{
    place_id: alternative.id, name: alternative.name, address: alternative.address,
    latitude: alternative.latitude, longitude: alternative.longitude,
    content_type_id: 39, category_name: '음식점', distance_meters: 100,
  }] : [] };
  const service = serviceWithModel({ reply: '점심을 새 식당으로 교체했습니다.', days: days(alternative.id) }, db);
  const result = await service.revise(request);
  assert.equal(result.changed, true);
  assert.equal(result.itinerary.days[0].visits[1].place.id, alternative.id);
  assert.equal(result.itinerary.days[0].visits[0].place.id, sight.id);
  assert.equal(itinerary.days[0].visits[1].place.id, food.id);
});

test('time changes apply, but unknown places and overlapping visits never apply', async () => {
  const moved = await serviceWithModel({ reply: '점심 시간을 조정했습니다.', days: days(food.id, '14:00') }).revise(request);
  assert.equal(moved.changed, true);
  assert.equal(moved.itinerary.days[0].visits[1].time, '14:00');
  for (const proposal of [days('invented-place'), days(food.id, '11:30')]) {
    const rejected = await serviceWithModel({ reply: '수정했습니다.', days: proposal }).revise(request);
    assert.equal(rejected.changed, false);
    assert.equal(rejected.itinerary, null);
    assert.match(rejected.reply, /변경되지 않았습니다/);
  }
});

test('a text answer or unchanged model proposal is never reported as an applied edit', async () => {
  const answer = await serviceWithModel({ reply: '경로 변경은 조건 수정 화면에서 해 주세요.' }).revise(request);
  const unchanged = await serviceWithModel({ reply: '바꿨습니다.', days: days(food.id) }).revise(request);
  assert.equal(answer.changed, false);
  assert.equal(unchanged.changed, false);
  assert.match(unchanged.reply, /변경되지 않았습니다/);
  assert.match(unchanged.reply, /현재 일정과 동일/);
  assert.doesNotMatch(unchanged.reply, /바꿨습니다/);
});

test('without AI configuration the current itinerary remains intact', async () => {
  const service = new ItineraryRevisionService();
  service.getGeminiClient = async () => null;
  const result = await service.revise(request);
  assert.equal(result.changed, false);
  assert.equal(result.itinerary, null);
});

test('a changed-day-only proposal updates that date and preserves the rest of a multi-day trip', async () => {
  const result = await serviceWithModel({ reply: '둘째 날 방문을 늦췄습니다.', days: [secondDayChange] })
    .revise({ ...request, itinerary: twoDayItinerary });
  assert.equal(result.changed, true);
  assert.deepEqual(result.itinerary.days[0], twoDayItinerary.days[0]);
  assert.equal(result.itinerary.days[1].visits[0].time, '14:00');
  assert.equal(twoDayItinerary.days[1].visits[0].time, '11:00');
});

test('proposal dates are matched by date, while unknown dates, duplicate dates and repeated places are rejected', async () => {
  const reordered = await serviceWithModel({ days: [secondDayChange, ...days(food.id)] })
    .revise({ ...request, itinerary: twoDayItinerary });
  assert.equal(reordered.changed, true);
  assert.deepEqual(reordered.itinerary.days.map(day => day.date), ['2026-10-30', '2026-10-31']);
  for (const proposal of [
    [{ ...secondDayChange, date: '2026-11-01' }],
    [secondDayChange, secondDayChange],
    [{ ...secondDayChange, visits: [{ ...secondDayChange.visits[0], placeId: sight.id }] }],
  ]) {
    const result = await serviceWithModel({ days: proposal }).revise({ ...request, itinerary: twoDayItinerary });
    assert.equal(result.changed, false);
    assert.equal(result.itinerary, null);
  }
});

test('an untouched legacy day does not block a valid edit on another date, and pre-arrival edits stay rejected', async () => {
  const legacy = structuredClone(twoDayItinerary);
  legacy.arrivalTime = '00:00';
  legacy.days[0].visits[0].time = '01:00';
  legacy.days[0].visits[0].endTime = '02:00';
  const result = await serviceWithModel({ days: [secondDayChange] }).revise({ ...request, itinerary: legacy });
  assert.equal(result.changed, true);
  assert.deepEqual(result.itinerary.days[0], legacy.days[0]);

  const laterArrival = { ...twoDayItinerary, arrivalDate: '2026-10-31', arrivalTime: '10:00' };
  const rejected = await serviceWithModel({ days: days(food.id, '14:00') }).revise({ ...request, itinerary: laterArrival });
  assert.equal(rejected.changed, false);
});

test('removing one day\'s visits preserves other days and a mixed invalid proposal applies nothing', async () => {
  const removed = await serviceWithModel({ days: [{ date: '2026-10-31', visits: [] }] })
    .revise({ ...request, itinerary: twoDayItinerary });
  assert.equal(removed.changed, true);
  assert.equal(removed.itinerary.days[1].visits.length, 0);
  assert.deepEqual(removed.itinerary.days[0], twoDayItinerary.days[0]);

  const rejected = await serviceWithModel({ days: [secondDayChange, ...days('invented-place')] })
    .revise({ ...request, itinerary: twoDayItinerary });
  assert.equal(rejected.changed, false);
  assert.equal(rejected.itinerary, null);
  assert.equal(twoDayItinerary.days[1].visits[0].time, '11:00');
});

test('HTTP revision returns a complete updated itinerary for the result screen', async t => {
  const { Test } = require('@nestjs/testing');
  const { configureApp } = require('../dist/configure-app');
  const { ChatController } = require('../dist/chat/chat.controller');
  const { ChatService } = require('../dist/chat/chat.service');
  const module = await Test.createTestingModule({
    controllers: [ChatController],
    providers: [
      { provide: ChatService, useValue: {} },
      { provide: ItineraryRevisionService, useValue: serviceWithModel({ reply: '둘째 날을 늦췄습니다.', days: [secondDayChange] }) },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  t.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const url = `${await app.getUrl()}/api/chat/revise`;
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, itinerary: twoDayItinerary }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.changed, true);
  assert.match(body.reply, /일정에 반영했습니다/);
  assert.deepEqual(body.itinerary.days[0], twoDayItinerary.days[0]);
  assert.equal(body.itinerary.days[1].visits[0].time, '14:00');
});

test('the source controller injects all chat services under the actual tsx development runtime', () => {
  const script = `
    require('reflect-metadata');
    const assert = require('node:assert/strict');
    const { Test } = require('@nestjs/testing');
    const { ChatController } = require('./src/chat/chat.controller.ts');
    const { ChatService } = require('./src/chat/chat.service.ts');
    const { ItineraryRevisionService } = require('./src/chat/itinerary-revision.service.ts');
    (async () => {
      const input = { message: '점심 식당을 바꿔줘' };
      const calls = [];
      const module = await Test.createTestingModule({
        controllers: [ChatController],
        providers: [
          { provide: ChatService, useValue: {
            chat: async value => { calls.push(['chat', value]); return 'chat'; },
            planChat: async value => { calls.push(['planner', value]); return 'planner'; },
          } },
          { provide: ItineraryRevisionService, useValue: {
            revise: async value => { calls.push(['revise', value]); return { changed: true }; },
          } },
        ],
      }).compile();
      try {
        const controller = module.get(ChatController);
        assert.equal(await controller.chat(input), 'chat');
        assert.equal(await controller.planChat(input), 'planner');
        assert.deepEqual(await controller.revise(input), { changed: true });
        assert.deepEqual(calls.map(([name]) => name), ['chat', 'planner', 'revise']);
        assert.ok(calls.every(([, value]) => value === input));
      } finally { await module.close(); }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 60000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
