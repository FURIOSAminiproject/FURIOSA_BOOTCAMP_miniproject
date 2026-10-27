import React, { useEffect, useId, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { PlaceCategory } from "../services/route-explorer";
import {
  categoryTrail,
  childCategories,
  MAX_DETAIL_SELECTIONS,
  normalizeCategoryIds,
} from "../services/trip-categories";

/** 적용 전 선택은 모달 내부에만 보관한다. 취소·Escape는 기존 여행 조건을 바꾸지 않는다. */
export function CategoryDetailModal({
  rootId,
  name,
  categories,
  selectedIds,
  onApply,
  onClose,
}: {
  rootId: string;
  name: string;
  categories: PlaceCategory[];
  selectedIds: string[];
  onApply: (ids: string[]) => string | void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [selected, setSelected] = useState(() =>
    normalizeCategoryIds(selectedIds, categories, rootId),
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const available = childCategories(categories, rootId);
  const rows = available
    .map((category) => ({
      category,
      trail: categoryTrail(category, categories),
    }))
    .sort((a, b) =>
      a.trail
        .map((item) => item.name)
        .join(" > ")
        .localeCompare(b.trail.map((item) => item.name).join(" > "), "ko"),
    )
    .filter(({ trail }) =>
      trail.some((item) =>
        item.name
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      ),
    );

  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  function toggle(id: string) {
    const next = normalizeCategoryIds(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
      categories,
      rootId,
    );
    if (next.length > MAX_DETAIL_SELECTIONS) {
      setError(
        `상세 분류는 카테고리마다 최대 ${MAX_DETAIL_SELECTIONS}개 선택할 수 있어요.`,
      );
      return;
    }
    setError(null);
    setSelected(next);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[85dvh] overflow-hidden rounded-3xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/45"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const failure = onApply(selected);
          if (failure) setError(failure);
        }}
        className="flex max-h-[calc(85dvh_-_2px)] flex-col"
      >
        <header className="shrink-0 border-b border-stone-100 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-800">
                내가 들르고 싶은 곳
              </p>
              <h2 id={titleId} className="mt-1 text-xl font-bold">
                {name} 상세 분류
              </h2>
            </div>
            <button
              type="button"
              aria-label="상세 분류 닫기"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p
            id={descriptionId}
            className="mt-3 text-xs leading-relaxed text-stone-500"
          >
            여러 분류를 고를 수 있어요. 상위 분류를 선택하면 하위 분류도
            포함합니다. 다른 카테고리의 선택에는 영향을 주지 않아요.
          </p>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              aria-label="상세 분류 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="분류 이름으로 찾기"
              maxLength={100}
              className="w-full rounded-xl border border-stone-300 py-2.5 pl-9 pr-3 text-sm focus:outline-emerald-700"
            />
          </div>
        </header>
        <div className="min-h-0 overflow-y-auto p-5 sm:px-6 space-y-3">
          <button
            type="button"
            aria-pressed={!selected.length}
            onClick={() => {
              setSelected([]);
              setError(null);
            }}
            className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${!selected.length ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-stone-200"}`}
          >
            <span>
              <strong className="block text-sm">{name} 전체에서 추천</strong>
              <span className="mt-1 block text-xs text-stone-500">
                상세 분류를 제한하지 않아요.
              </span>
            </span>
            {!selected.length && <Check className="h-5 w-5 shrink-0" />}
          </button>
          {!available.length ? (
            <p
              role="status"
              className="rounded-xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-500"
            >
              이 카테고리에 등록된 하위 분류가 아직 없습니다. 우선 전체에서
              장소를 추천받을 수 있어요.
            </p>
          ) : !rows.length ? (
            <p role="status" className="p-4 text-sm text-stone-500">
              이름에 맞는 분류가 없어요. 다른 검색어를 입력해 보세요.
            </p>
          ) : (
            <div
              className="space-y-2"
              role="group"
              aria-label={`${name} 상세 분류 목록`}
            >
              {rows.map(({ category, trail }) => {
                const inherited = trail
                  .slice(0, -1)
                  .some((parent) => selected.includes(parent.id));
                return (
                  <label
                    key={category.id}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 ${inherited || selected.includes(category.id) ? "border-emerald-200 bg-emerald-50/60" : "border-stone-200"} ${inherited ? "opacity-60" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      aria-label={trail.map((item) => item.name).join(" > ")}
                      checked={inherited || selected.includes(category.id)}
                      disabled={inherited}
                      onChange={() => toggle(category.id)}
                      className="mt-1 accent-emerald-800"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {category.name}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-stone-500">
                        {trail
                          .slice(0, -1)
                          .map((item) => item.name)
                          .join(" › ") || "대분류"}
                        {category.level < 3 ? " · 하위 분류 포함" : ""}
                        {inherited ? " · 상위 선택에 포함" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <footer className="shrink-0 border-t border-stone-100 bg-white p-5 sm:px-6 space-y-3">
          <p aria-live="polite" className="text-xs text-stone-500">
            {selected.length
              ? `상세 분류 ${selected.length}개 선택 · 하위 분류 포함`
              : `${name} 전체 선택`}
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[#064e43] px-5 py-3 text-sm font-bold text-white"
            >
              {name} 선택 적용
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
