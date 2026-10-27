import type { PlaceCategory } from "./route-explorer";

export const MAX_DETAIL_SELECTIONS = 20;
export const MAX_CATEGORY_FILTERS = 200;

/** 상위 카테고리 이름과 ID는 DB LEVEL1 행 그대로 사용한다. 별도 목록·유형별 매핑은 없다. */
export function rootCategories(categories: PlaceCategory[]): PlaceCategory[] {
  return categories.filter(
    (category) => category.level === 1 && category.parentId === null,
  );
}
export function categoryTrail(
  category: PlaceCategory,
  categories: PlaceCategory[],
): PlaceCategory[] {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const trail: PlaceCategory[] = [];
  const seen = new Set<string>();
  let current: PlaceCategory | undefined = category;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}
/** 이름이 같아도 부모 UUID로 구분하고 선택한 LEVEL1의 LEVEL2·3만 반환한다. */
export function childCategories(
  categories: PlaceCategory[],
  rootId: string,
): PlaceCategory[] {
  return categories.filter((category) => {
    if (category.level !== 2 && category.level !== 3) return false;
    const trail = categoryTrail(category, categories);
    return (
      trail[0]?.id === rootId &&
      trail[0].level === 1 &&
      trail[0].parentId === null
    );
  });
}
export function normalizeCategoryIds(
  ids: string[],
  categories: PlaceCategory[],
  rootId: string,
): string[] {
  const allowed = childCategories(categories, rootId);
  const selected = new Set(
    ids.filter((id) => allowed.some((category) => category.id === id)),
  );
  return [...selected].filter(
    (id) =>
      !categoryTrail(
        allowed.find((category) => category.id === id)!,
        categories,
      )
        .slice(0, -1)
        .some((parent) => selected.has(parent.id)),
  );
}
