const { test } = require("node:test");
const assert = require("node:assert/strict");
// Node 22.18 이상에서 타입 전용 구문을 제거해 순수 상태 로직을 직접 검사한다.
const {
  createTripWorkspace,
  tripWorkspaceReducer: reduce,
  tripCompareRequest,
} = require("../src/services/trip-workspace.ts");

const origin = {
  id: "selected-origin",
  name: "선택한 출발지",
  address: "선택 주소",
  longitude: 127,
  latitude: 37,
};
const destination = {
  ...origin,
  id: "selected-destination",
  name: "선택한 도착지",
  latitude: 37.1,
};
function selected() {
  return reduce(createTripWorkspace(), {
    type: "edit",
    patch: {
      origin,
      originQuery: origin.name,
      destination,
      destinationQuery: destination.name,
    },
  });
}
function completed() {
  const state = selected();
  return reduce(state, {
    type: "complete",
    result: {
      title: "실제 조회 결과",
      request: tripCompareRequest(state.draft),
      comparison: {
        radiusMeters: 1000,
        recommendationBasis: "distance_to_route",
        routes: [
          { preference: "recommended", route: null },
          { preference: "shortest", route: { distanceMeters: 1000 } },
        ],
      },
    },
  });
}

test("fresh trip has no fabricated location or itinerary and cannot be submitted", () => {
  const state = createTripWorkspace();
  assert.equal(state.draft.origin, null);
  assert.equal(state.draft.destination, null);
  assert.equal(state.draft.originQuery, "");
  assert.equal(state.draft.destinationQuery, "");
  assert.equal(state.result, null);
  assert.equal(tripCompareRequest(state.draft), null);
});

test("typed search terms alone never become routable coordinates", () => {
  const state = reduce(createTripWorkspace(), {
    type: "edit",
    patch: { originQuery: "서울역", destinationQuery: "서울시청" },
  });
  assert.equal(tripCompareRequest(state.draft), null);
});

test("changing a selected search term clears the old coordinate and route result", () => {
  const state = completed();
  const updated = reduce(state, {
    type: "edit",
    patch: { originQuery: "새 출발지" },
  });
  assert.equal(updated.draft.origin, null);
  assert.deepEqual(updated.draft.destination, destination);
  assert.equal(updated.result, null);
  assert.equal(tripCompareRequest(updated.draft), null);
  assert.ok(state.result); // 이전 상태 객체를 변형하지 않는다.
});

test("mode/category edits invalidate the old response, while selected points stay available", () => {
  for (const patch of [
    { mode: "walking" },
    { contentTypeIds: [39] },
    { radiusMeters: 5000 },
  ]) {
    const state = reduce(completed(), { type: "edit", patch });
    assert.equal(state.result, null);
    assert.deepEqual(state.draft.origin, origin);
  }
});

test("completion selects a successful route and cannot select a failed alternative", () => {
  const state = completed();
  assert.equal(state.active, "shortest");
  assert.equal(
    reduce(state, { type: "select-route", preference: "recommended" }),
    state,
  );
});

test("new trip and region shortcuts clear prior results and never preselect a coordinate", () => {
  const state = reduce(completed(), { type: "new", destinationQuery: "제주" });
  assert.equal(state.result, null);
  assert.equal(state.draft.destinationQuery, "제주");
  assert.equal(state.draft.destination, null);
  assert.equal(state.draft.origin, null);
});

test("comparison payload copies user choices and leaves display-only metadata out", () => {
  const state = selected();
  state.draft.title = "표시 전용 여행 제목";
  const request = tripCompareRequest(state.draft);
  assert.equal(request.mode, "driving");
  assert.deepEqual(request.contentTypeIds, [12, 39]);
  assert.equal("title" in request, false);
  request.points[0].latitude = 0;
  request.contentTypeIds.push(32);
  assert.equal(state.draft.origin.latitude, 37);
  assert.deepEqual(state.draft.contentTypeIds, [12, 39]);
});
