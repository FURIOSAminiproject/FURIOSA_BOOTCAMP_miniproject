const { test } = require('node:test');
const assert = require('node:assert/strict');
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
