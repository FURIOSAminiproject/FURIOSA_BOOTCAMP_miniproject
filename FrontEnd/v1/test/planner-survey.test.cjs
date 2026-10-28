const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  surveyStep,
  scheduleFromText,
  explicitTravelMode,
} = require("../src/services/planner-survey.ts");

test("frontend requires explicit transport and a preference answer before completing", () => {
  const draft = scheduleFromText("2026-10-28 1박 2일 09:30", {
    originName: "서울",
    destinationName: "춘천",
    mode: "driving",
  });
  assert.equal(surveyStep(draft), 3);
  assert.equal(surveyStep({ ...draft, modeConfirmed: true }), 4);
  assert.equal(
    surveyStep({ ...draft, modeConfirmed: true, preferences: "맛집과 자연" }),
    5,
  );
  assert.equal(draft.endDate, "2026-10-29");
});

test("ambiguous or unsupported transport is never silently mapped to a car", () => {
  for (const answer of ["네", "아무거나", "대중교통", "기차"])
    assert.equal(explicitTravelMode(answer), null);
  assert.equal(explicitTravelMode("자동차로 운전"), "driving");
  assert.equal(explicitTravelMode("도보로 걷고 싶어"), "walking");
});
