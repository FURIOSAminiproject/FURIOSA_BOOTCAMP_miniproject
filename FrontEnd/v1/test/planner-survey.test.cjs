const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  surveyStep,
  scheduleFromText,
  explicitTravelMode,
  surveyPrompt,
} = require("../src/services/planner-survey.ts");

test("frontend requires explicit transport and preference completion", () => {
  const draft = scheduleFromText("2026-10-28 1박 2일 09:30", {
    originName: "서울",
    destinationName: "춘천",
    mode: "driving",
  });
  assert.equal(surveyStep(draft), 3);
  assert.equal(surveyStep({ ...draft, modeConfirmed: true }), 4);
  assert.equal(
    surveyStep({ ...draft, modeConfirmed: true, preferences: "맛집과 자연" }),
    4,
  );
  assert.equal(
    surveyStep({
      ...draft,
      modeConfirmed: true,
      preferences: "맛집과 자연",
      preferencesConfirmed: true,
    }),
    5,
  );
  assert.match(surveyPrompt(4, { preferences: "맛집" }), /선택 완료/);
  assert.equal(draft.endDate, "2026-10-29");
});

test("ambiguous or unsupported transport is never silently mapped to a car", () => {
  for (const answer of ["네", "아무거나", "대중교통", "기차"])
    assert.equal(explicitTravelMode(answer), null);
  assert.equal(explicitTravelMode("자동차로 운전"), "driving");
  assert.equal(explicitTravelMode("도보로 걷고 싶어"), "walking");
});

test("a period and time answer asks only for the missing date and then advances", () => {
  const origin = { originName: "서울", destinationName: "춘천" };
  const partial = scheduleFromText(
    "2박 3일 일정이고, 오전 8시 30분에 일찍 출발할게요",
    origin,
  );
  assert.equal(surveyStep(partial), 2);
  assert.equal(partial.durationLabel, "2박 3일");
  assert.equal(partial.departureTime, "08:30");
  const prompt = surveyPrompt(2, partial);
  assert.match(prompt, /출발 날짜만/);
  assert.doesNotMatch(prompt, /여행 기간.*알려주세요/);
  const complete = scheduleFromText("2026-10-29", partial);
  assert.equal(complete.endDate, "2026-10-31");
  assert.equal(surveyStep(complete), 3);
});
