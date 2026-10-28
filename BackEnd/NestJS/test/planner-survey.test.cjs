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

test('transport confirmation and preferences each require their own answer', async () => {
  const chat = new ChatService();
  const car = await chat.planChat({
    currentStep: 3,
    message: '자동차로 운전할게요',
    currentDraft: schedule,
  });
  assert.equal(car.step, 4);
  assert.equal(car.isReady, false);
  assert.equal(car.extracted.modeConfirmed, true);
  const ready = await chat.planChat({
    currentStep: 4,
    message: '문화 유적과 맛집',
    currentDraft: car.extracted,
  });
  assert.equal(ready.step, 5);
  assert.equal(ready.isReady, true);
  assert.equal(ready.extracted.preferences, '문화 유적과 맛집');
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
