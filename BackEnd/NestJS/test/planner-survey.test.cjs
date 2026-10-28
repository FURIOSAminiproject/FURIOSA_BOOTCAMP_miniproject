const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatService } = require('../dist/chat/chat.service');
const {
  scheduleFromText,
  explicitTravelMode,
  surveyStep,
} = require('../dist/chat/planner-survey');
const schedule = {
  originName: '서울',
  destinationName: '춘천',
  startDate: '2026-10-28',
  endDate: '2026-10-29',
  durationLabel: '1박 2일',
  departureTime: '09:30',
};

test('offline origin and destination extraction begins the date question without a default vehicle', async () => {
  const chat = new ChatService();
  chat.getGeminiClient = async () => null;
  const response = await chat.planChat({
    currentStep: 1,
    message: '서울에서 춘천으로 가고 싶어요',
  });
  assert.equal(response.extracted.originName, '서울');
  assert.equal(response.extracted.destinationName, '춘천');
  assert.equal(response.step, 2);
  assert.equal(response.extracted.mode, null);
});

test('a period answer cannot complete the survey or silently select a car', async () => {
  const chat = new ChatService();
  const response = await chat.planChat({
    currentStep: 2,
    message: '10월 28일 1박 2일 오전 9시 30분',
    currentDraft: {
      originName: '서울',
      destinationName: '춘천',
      mode: 'driving',
    },
  });
  assert.equal(response.step, 3);
  assert.equal(response.isReady, false);
  assert.equal(response.extracted.modeConfirmed, false);
  assert.equal(response.extracted.preferences, undefined);
  assert.equal(response.extracted.endDate, '2026-10-29');
});

test('split schedule answers preserve the selected period and time', async () => {
  const chat = new ChatService();
  const partial = await chat.planChat({
    currentStep: 2,
    message: '2박 3일 일정이고, 오전 8시 30분에 일찍 출발할게요',
    currentDraft: { originName: '서울', destinationName: '춘천' },
  });
  assert.equal(partial.step, 2);
  assert.match(partial.reply, /출발 날짜만/);
  assert.equal(partial.extracted.durationLabel, '2박 3일');
  assert.equal(partial.extracted.departureTime, '08:30');
  const complete = await chat.planChat({
    currentStep: 2,
    message: '2026-10-29',
    currentDraft: partial.extracted,
  });
  assert.equal(complete.step, 3);
  assert.equal(complete.extracted.endDate, '2026-10-31');
  assert.equal(complete.extracted.departureTime, '08:30');
});

test('unsupported and ambiguous transport answers remain at step 3', async () => {
  const chat = new ChatService();
  for (const message of [
    '아무거나',
    '네',
    '대중교통',
    '버스로 가고 도보 산책할래',
  ]) {
    const response = await chat.planChat({
      currentStep: 3,
      message,
      currentDraft: schedule,
    });
    assert.equal(response.step, 3);
    assert.equal(response.isReady, false);
    assert.notEqual(response.extracted.modeConfirmed, true);
  }
});

test('travel themes can be combined before explicit preference completion', async () => {
  const chat = new ChatService();
  const car = await chat.planChat({
    currentStep: 3,
    message: '자동차로 운전할게요',
    currentDraft: schedule,
  });
  assert.equal(car.step, 4);
  assert.equal(car.isReady, false);
  assert.equal(car.extracted.modeConfirmed, true);
  const first = await chat.planChat({
    currentStep: 4,
    message: '문화 유적과 맛집',
    currentDraft: car.extracted,
  });
  assert.equal(first.step, 4);
  assert.equal(first.isReady, false);
  const second = await chat.planChat({
    currentStep: 4,
    message: '자연 공원도 좋아요',
    currentDraft: first.extracted,
  });
  assert.equal(second.step, 4);
  assert.match(second.extracted.preferences, /문화 유적과 맛집, 자연 공원도 좋아요/);
  assert.ok(
    second.extracted.selectedCategoryIds.includes(
      '6486b07a-4e08-4f42-9942-eec0b631592b',
    ),
  );
  assert.ok(second.extracted.selectedCategoryIds.length > first.extracted.selectedCategoryIds.length);
  const ready = await chat.planChat({
    currentStep: 4,
    message: '선택 완료',
    currentDraft: second.extracted,
  });
  assert.equal(ready.step, 5);
  assert.equal(ready.isReady, true);
  assert.equal(ready.extracted.preferences, second.extracted.preferences);
  assert.equal(ready.extracted.preferencesConfirmed, true);
  assert.equal(explicitTravelMode('걸어서 여행할래'), 'walking');
});

test('claiming a later step does not bypass missing transport confirmation', async () => {
  const chat = new ChatService();
  const response = await chat.planChat({
    currentStep: 4,
    message: '카페',
    currentDraft: { ...schedule, mode: 'driving' },
  });
  assert.equal(response.step, 3);
  assert.equal(response.isReady, false);
  assert.equal(
    surveyStep({ ...schedule, mode: 'walking', modeConfirmed: true }),
    4,
  );
});

test('overnight dates are stable across time zones and split answers', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Asia/Seoul', 'UTC', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      const result = scheduleFromText(
        '10월 28일 오전 9시 반',
        { durationLabel: '1박 2일' },
        new Date('2026-10-27T16:00:00Z'),
      );
      assert.equal(result.startDate, '2026-10-28');
      assert.equal(result.endDate, '2026-10-29');
      assert.equal(result.departureTime, '09:30');
      assert.equal(
        scheduleFromText(
          '오늘 2박 3일 08:00',
          {},
          new Date('2026-10-27T16:00:00Z'),
        ).endDate,
        '2026-10-30',
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('AI interprets natural schedule wording and keeps missing fields guarded', async () => {
  const chat = new ChatService();
  let sent;
  chat.getGeminiClient = async () => ({
    modelName: 'stub-gemini',
    ai: {
      models: {
        generateContent: async (input) => {
          sent = JSON.parse(input.contents);
          return {
            text: JSON.stringify({
              startDate: '2026-10-31',
              durationDays: 3,
              departureTime: '07:00',
              acknowledgment: '여유 있는 주말 여행이군요.',
            }),
          };
        },
      },
    },
  });
  const result = await chat.planChat({
    currentStep: 2,
    message: '이번 주말 2박 3일, 아침 일곱시쯤 떠날래',
    currentDraft: { originName: '서울', destinationName: '춘천' },
    history: [{ role: 'user', content: '서울에서 춘천으로' }],
  });
  assert.equal(result.modelUsed, 'stub-gemini');
  assert.equal(result.extracted.startDate, '2026-10-31');
  assert.equal(result.extracted.endDate, '2026-11-02');
  assert.equal(result.extracted.departureTime, '07:00');
  assert.equal(result.step, 3);
  assert.match(result.reply, /여유 있는 주말 여행/);
  assert.equal(sent.history.length, 1);
  assert.equal(sent.step, 2);
});

test('AI can understand an explicit walking synonym but cannot invent a transport choice', async () => {
  const chat = new ChatService();
  chat.getGeminiClient = async () => ({
    modelName: 'stub-gemini',
    ai: {
      models: { generateContent: async () => ({ text: '{"mode":"walking"}' }) },
    },
  });
  const walk = await chat.planChat({
    currentStep: 3,
    message: '뚜벅이로 갈래',
    currentDraft: schedule,
  });
  assert.equal(walk.extracted.mode, 'walking');
  assert.equal(walk.step, 4);
  const vague = await chat.planChat({
    currentStep: 3,
    message: '아무거나',
    currentDraft: schedule,
  });
  assert.equal(vague.step, 3);
  assert.notEqual(vague.extracted.modeConfirmed, true);
});

test('AI selects preference themes rather than fixed keyword defaults', async () => {
  const chat = new ChatService();
  chat.getGeminiClient = async () => ({
    modelName: 'stub-gemini',
    ai: {
      models: {
        generateContent: async () => ({
          text: '{"categoryThemes":["culture","nature"]}',
        }),
      },
    },
  });
  const result = await chat.planChat({
    currentStep: 4,
    message: '조용한 시간을 보내고 싶어요',
    currentDraft: { ...schedule, mode: 'walking', modeConfirmed: true },
  });
  assert.equal(result.step, 4);
  assert.deepEqual(result.extracted.selectedCategoryIds, [
    '6486b07a-4e08-4f42-9942-eec0b631592b',
    '1cd55dd3-084a-4f30-aa37-b9f772807d90',
  ]);
});

test('an explicit restaurant choice survives an unrelated AI theme suggestion', async () => {
  const chat = new ChatService();
  chat.getGeminiClient = async () => ({
    modelName: 'stub-gemini',
    ai: {
      models: {
        generateContent: async () => ({
          text: '{"categoryThemes":["nature"]}',
        }),
      },
    },
  });
  const result = await chat.planChat({
    currentStep: 4,
    message: '도착지 로컬 맛집도 가고 싶어요',
    currentDraft: { ...schedule, mode: 'walking', modeConfirmed: true },
  });
  assert.equal(result.step, 4);
  assert.ok(
    result.extracted.selectedCategoryIds.includes(
      'dd608518-f993-4a23-bd10-2c59a24fa674',
    ),
  );
  assert.ok(
    result.extracted.selectedCategoryIds.includes(
      '6486b07a-4e08-4f42-9942-eec0b631592b',
    ),
  );
});

test('lodging-only preference does not invent restaurant or nature categories', async () => {
  const chat = new ChatService();
  chat.getGeminiClient = async () => null;
  const selected = await chat.planChat({
    currentStep: 4,
    message: '조용한 숙박시설을 찾고 싶어요',
    currentDraft: { ...schedule, mode: 'walking', modeConfirmed: true },
  });
  assert.equal(selected.step, 4);
  assert.deepEqual(selected.extracted.selectedCategoryIds, []);
  assert.equal(selected.extracted.preferences, '조용한 숙박시설을 찾고 싶어요');
  const completed = await chat.planChat({
    currentStep: 4,
    message: '선택 완료',
    currentDraft: selected.extracted,
  });
  assert.equal(completed.step, 5);
});
