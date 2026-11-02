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
