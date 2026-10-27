const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  rootCategories,
  childCategories,
  categoryTrail,
  normalizeCategoryIds,
} = require("../src/services/trip-categories.ts");
const {
  createTripWorkspace,
  tripWorkspaceReducer: reduce,
  tripCompareRequest,
} = require("../src/services/trip-workspace.ts");
const rows = [
  { id: "a", name: "DB 대분류 원문 A", level: 1, parentId: null },
  { id: "a2", name: "중분류", level: 2, parentId: "a" },
  { id: "a3", name: "소분류", level: 3, parentId: "a2" },
  { id: "a4", name: "다른 중분류", level: 2, parentId: "a" },
  { id: "b", name: "DB 대분류 원문 B", level: 1, parentId: null },
  { id: "b2", name: "중분류", level: 2, parentId: "b" },
  { id: "orphan", name: "고아 분류", level: 3, parentId: "missing" },
];
test("top choices are exactly DB LEVEL1 rows and preserve their names and UUIDs", () => {
  assert.deepEqual(rootCategories(rows), [rows[0], rows[4]]);
  assert.deepEqual(createTripWorkspace().draft.selectedCategoryIds, []);
});
test("details follow parent UUIDs, including same-name categories, and exclude the root itself", () => {
  assert.deepEqual(
    childCategories(rows, "a").map((c) => c.id),
    ["a2", "a3", "a4"],
  );
  assert.deepEqual(
    normalizeCategoryIds(["a", "a2", "a3", "b2", "orphan"], rows, "a"),
    ["a2"],
  );
  assert.deepEqual(
    categoryTrail(rows[2], rows).map((c) => c.name),
    ["DB 대분류 원문 A", "중분류", "소분류"],
  );
});
test("whole-root and multiple-detail choices are ORed using existing DB category IDs without type restrictions", () => {
  const state = reduce(createTripWorkspace(), {
    type: "edit",
    patch: {
      origin: { id: "x", name: "x", address: "", latitude: 37, longitude: 127 },
      destination: {
        id: "y",
        name: "y",
        address: "",
        latitude: 38,
        longitude: 128,
      },
      selectedCategoryIds: ["a", "b"],
      categorySelections: { a: ["a3", "a4"], b: [] },
    },
  });
  const input = tripCompareRequest(state.draft);
  assert.deepEqual(input.contentTypeIds, []);
  assert.deepEqual(input.categoryIds, ["a3", "a4", "b"]);
  assert.equal("categoryFilters" in input, false);
  input.categoryIds.push("changed");
  assert.deepEqual(state.draft.categorySelections.a, ["a3", "a4"]);
});
test("unchecking a LEVEL1 removes its details and does not keep a hidden restriction on reselect", () => {
  const state = reduce(createTripWorkspace(), {
    type: "edit",
    patch: {
      selectedCategoryIds: ["a", "b"],
      categorySelections: { a: ["a3"], b: ["b2"] },
    },
  });
  const next = reduce(state, {
    type: "edit",
    patch: { selectedCategoryIds: ["b"] },
  });
  assert.deepEqual(next.draft.categorySelections, { b: ["b2"] });
  assert.deepEqual(state.draft.categorySelections, { a: ["a3"], b: ["b2"] });
  assert.equal(
    reduce(next, { type: "edit", patch: { selectedCategoryIds: ["a", "b"] } })
      .draft.categorySelections.a,
    undefined,
  );
});
